import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { initiateStkPush, normaliseMpesaPhone } from "./daraja";
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

    const identity = await verifyMemberIdentity(
      {
        nationalId: data.national_id,
        phone: data.phone,
        fullName: profile.full_name ?? undefined,
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
      "https://codebase-migration-studio.lovable.app";
    const callbackUrl = `${origin.replace(/\/+$/, "")}/api/mpesa/callback`;

    // Record a pending payment row (uses service role only via RPC or RLS-safe insert)
    const reference = `CCAK-${profile.member_no}`.slice(0, 12);
    const { data: payment, error: payError } = await context.supabase
      .from("member_contributions")
      .insert({
        member_user_id: context.userId,
        amount_kes: amount,
        phone,
        national_id: data.national_id,
        status: "pending",
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

      await context.supabase
        .from("member_contributions")
        .update({
          checkout_request_id: stk.checkoutRequestId,
          merchant_request_id: stk.merchantRequestId,
        })
        .eq("id", payment.id);

      return {
        paymentId: payment.id,
        checkoutRequestId: stk.checkoutRequestId,
        customerMessage: stk.customerMessage,
        amount,
      };
    } catch (err) {
      await context.supabase
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
      .select("id, amount_kes, status, mpesa_receipt, paid_at, created_at")
      .eq("member_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      return { payments: [] as Array<Record<string, unknown>>, digitalCardUnlocked: false, amountKes: amount };
    }
    const payments = data ?? [];
    const digitalCardUnlocked = payments.some((p) => p.status === "paid");
    return { payments, digitalCardUnlocked, amountKes: amount };
  });
