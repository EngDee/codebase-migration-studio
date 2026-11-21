import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { initiateStkPush, normaliseMpesaPhone, requireDarajaConfiguration, queryStkResult } from "./daraja";
import { cardEligible } from "./rules";
import { canReconcileContribution, isLiveContribution } from "./contribution-documents";
import { verifyMemberIdentity } from "@/lib/identity/verify";

/** Default annual contribution in KES – override with MEMBER_CONTRIBUTION_KES. */
export function contributionAmountKes(): number {
  const raw = process.env["MEMBER_CONTRIBUTION_KES"];
  const n = raw ? Number(raw) : 500;
  return Number.isFinite(n) && n >= 1 ? Math.round(n) : 500;
}

const initiateSchema = z.object({
  phone: z.string().min(9).max(15),
  national_id: z.string().regex(/^[0-9]{6,10}$/, "Enter a valid National ID"),
});

/**
 * Start an M-Pesa STK Push for the member contribution that unlocks the
 * digital membership card. Requires an authenticated, approved member.
 */
export const initiateContributionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => initiateSchema.parse(input))
  .handler(async ({ data, context }) => {
    requireDarajaConfiguration();
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("id, full_name, phone, national_id, county, member_no, status")
      .eq("id", context.userId)
      .single();

    if (profileError || !profile) throw new Error("Could not load your membership profile.");
    if (profile.status !== "approved") {
      throw new Error("Only approved members can pay the contribution and unlock the digital ID card.");
    }
    if (!profile.member_no) {
      throw new Error("Your membership number has not been issued yet. Contact the association.");
    }
    const { data: existing, error: existingError } = await context.supabase.from("member_contributions")
      .select("status,payment_environment").eq("member_user_id", context.userId);
    if (existingError) throw new Error("Could not check existing payments. Please try again.");
    if (existing?.some(isLiveContribution)) throw new Error("Your contribution is already paid. Refresh to access your card and receipt.");
    if (existing?.some((payment) => payment.status === "pending")) throw new Error("You already have a payment awaiting confirmation. Refresh its status instead of paying again.");

    const identity = await verifyMemberIdentity(
      {
        nationalId: data.national_id,
        phone: data.phone,
        ...(profile.full_name ? { fullName: profile.full_name } : {}),
      },
      { national_id: profile.national_id, phone: profile.phone },
    );
    if (!identity.matched) {
      throw new Error(identity.message);
    }

    const phone = identity.normalisedPhone ?? normaliseMpesaPhone(data.phone);
    const amount = contributionAmountKes();
    const origin =
      process.env["PUBLIC_APP_URL"] ||
      process.env["VITE_APP_URL"] ||
      "https://coffeechampions.co.ke";
    const callbackUrl = `${origin.replace(/\/+$/, "")}/api/public/mpesa/callback`;

    // Only the server can write payment rows, after checking member eligibility.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Record a pending payment row (uses service role only via RPC or RLS-safe insert)
    const reference = `CCAK-${profile.member_no}`.slice(0, 12);
    const { data: payment, error: payError } = await supabaseAdmin
      .from("member_contributions")
      .insert({
        member_user_id: context.userId,
        amount_kes: amount,
        phone,
        national_id: data.national_id,
        status: "pending",
        payment_environment: process.env["DARAJA_ENV"],
        account_reference: reference,
      })
      .select("id")
      .single();

    if (payError || !payment) {
      // Table may not exist yet – surface a clear message
      throw new Error(
        payError?.message?.includes("member_contributions")
          ? "Contribution payments are not fully activated in the database yet. Ask an administrator to run the payments migration."
          : "Could not start the payment. Please try again.",
      );
    }

    try {
      const stk = await initiateStkPush({
        amount,
        phone,
        accountReference: reference,
        transactionDesc: "CCAK membership",
        callbackUrl,
      });

      const { error: attachError } = await supabaseAdmin
        .from("member_contributions")
        .update({
          checkout_request_id: stk.checkoutRequestId,
          merchant_request_id: stk.merchantRequestId,
        })
        .eq("id", payment.id);
      if (attachError) throw new Error("Payment tracking could not be saved. Contact CCAK before trying again.");

      return {
        paymentId: payment.id,
        checkoutRequestId: stk.checkoutRequestId,
        customerMessage: stk.customerMessage,
        amount,
      };
    } catch (err) {
      await supabaseAdmin
        .from("member_contributions")
        .update({ status: "failed", result_desc: err instanceof Error ? err.message : "STK failed" })
        .eq("id", payment.id);
      throw err instanceof Error ? err : new Error("Could not reach M-Pesa. Try again shortly.");
    }
  });

export const getMyContributionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const amount = contributionAmountKes();
    const { data, error } = await context.supabase
      .from("member_contributions")
      .select("id, amount_kes, status, payment_environment, mpesa_receipt, paid_at, created_at, result_desc, checkout_request_id, verification_checked_at")
      .eq("member_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      throw new Error("Could not load your contribution status. Please try again.");
    }
    const payments = data ?? [];
    let verificationWarning: string | null = null;
    const pending = payments.find((payment) => canReconcileContribution(payment, process.env["DARAJA_ENV"]));
    if (pending?.checkout_request_id && (!pending.verification_checked_at || Date.now() - Date.parse(pending.verification_checked_at) > 60_000)) {
      // Owner has already been authenticated and read the row through RLS. Claim a bounded verification attempt.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const checkedAt = new Date().toISOString();
      let claim = supabaseAdmin.from("member_contributions").update({ verification_checked_at: checkedAt })
        .eq("id", pending.id).eq("member_user_id", context.userId).eq("status", "pending");
      claim = pending.verification_checked_at ? claim.eq("verification_checked_at", pending.verification_checked_at) : claim.is("verification_checked_at", null);
      const { data: claimed, error: claimError } = await claim.select("id").maybeSingle();
      if (claimed && !claimError) {
        try {
          const resultCode = await queryStkResult(pending.checkout_request_id);
          if (resultCode === 0) {
            const { data: settled, error: settlementError } = await supabaseAdmin.from("member_contributions").update({
              status: "paid", paid_at: checkedAt, updated_at: checkedAt,
              result_desc: "Reconciled through Safaricom STK query ResultCode 0; paid_at records reconciliation time. Receipt reference awaiting provider callback.",
            }).eq("id", pending.id).eq("member_user_id", context.userId).eq("status", "pending")
              .eq("payment_environment", pending.payment_environment)
              .select("id, amount_kes, status, payment_environment, mpesa_receipt, paid_at, created_at, result_desc, checkout_request_id, verification_checked_at").maybeSingle();
            if (settlementError) throw settlementError;
            if (settled) payments.splice(payments.findIndex((payment) => payment.id === settled.id), 1, settled);
          }
        } catch {
          verificationWarning = "Safaricom confirmation is temporarily unavailable. Do not pay again; refresh the payment status shortly.";
        }
      }
    }
    const { data: profile, error: profileError } = await context.supabase.from("profiles").select("status,member_no").eq("id", context.userId).single();
    if (profileError || !profile) throw new Error("Could not confirm card eligibility.");
    const digitalCardUnlocked = cardEligible(profile.status, profile.member_no, payments.some(isLiveContribution));
    return { payments, verificationWarning, digitalCardUnlocked, amountKes: amount, presidentName: process.env["CCAK_PRESIDENT_NAME"] ?? "David Muigai Miringu" };
  });
