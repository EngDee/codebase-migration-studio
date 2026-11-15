import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { donationSchema } from "./rules";
import { requireShopPaymentMode } from "@/lib/shop/catalog";
import { initiateStkPush, normaliseMpesaPhone, requireDarajaConfiguration } from "@/lib/payments/daraja";

export const startDonation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => donationSchema.parse(input))
  .handler(async ({ data }) => {
    const environment = requireShopPaymentMode(process.env["DARAJA_ENV"]);
    requireDarajaConfiguration();
    const phone = normaliseMpesaPhone(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const recent = await supabaseAdmin.from("donations").select("id", { count: "exact", head: true })
      .eq("phone", phone).gte("created_at", new Date(Date.now() - 600000).toISOString());
    if (recent.error) throw new Error("Donation could not be started. Please try again.");
    if ((recent.count ?? 0) >= 3) throw new Error("Please wait a few minutes before sending another M-Pesa prompt to this number.");
    const row = await supabaseAdmin.from("donations").insert({ phone, amount_kes: data.amount_kes, donor_name: data.donor_name ?? null, payment_environment: environment }).select("id").single();
    if (row.error || !row.data) throw new Error("Donation could not be started. Please try again.");
    try {
      const origin = process.env["PUBLIC_APP_URL"] || "https://codebase-migration-studio.lovable.app";
      const stk = await initiateStkPush({ amount: data.amount_kes, phone, accountReference: "CCAKDONATE", transactionDesc: "CCAK donation", callbackUrl: `${origin.replace(/\/+$/, "")}/api/public/donate/mpesa/callback` });
      const attached = await supabaseAdmin.from("donations").update({ checkout_request_id: stk.checkoutRequestId, merchant_request_id: stk.merchantRequestId }).eq("id", row.data.id);
      if (attached.error) throw new Error("tracking");
      return { id: row.data.id };
    } catch {
      await supabaseAdmin.from("donations").update({ status: "failed" }).eq("id", row.data.id).eq("status", "pending");
      throw new Error("Safaricom could not send the M-Pesa prompt. Check the number and try again.");
    }
  });

export const getDonationStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin.from("donations").select("status,amount_kes,mpesa_receipt").eq("id", data.id).maybeSingle();
    if (r.error || !r.data) throw new Error("Donation not found.");
    return r.data;
  });
