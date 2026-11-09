import { createFileRoute } from "@tanstack/react-router";
import { parseStkCallback, queryStkResult, requireDarajaConfiguration } from "@/lib/payments/daraja";
import { callbackMatchesPayment } from "@/lib/payments/rules";

export const Route = createFileRoute("/api/public/mpesa/callback")({
  server: { handlers: { POST: async ({ request }) => {
    let parsed;
    try {
      const text = await request.text();
      if (text.length > 16000) return new Response(null, { status: 413 });
      parsed = parseStkCallback(JSON.parse(text));
    } catch {
      return Response.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 });
    }
    try {
      requireDarajaConfiguration();
      // Verify against Safaricom before loading the privileged database client.
      const resultCode = await queryStkResult(parsed.checkoutRequestId);
      if (resultCode !== parsed.resultCode) return new Response(null, { status: 409 });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: payment, error } = await supabaseAdmin.from("member_contributions").select("*").eq("checkout_request_id", parsed.checkoutRequestId).maybeSingle();
      if (error) throw error;
      if (!payment || payment.merchant_request_id !== parsed.merchantRequestId) return new Response(null, { status: 404 });
      if (parsed.success && (!parsed.mpesaReceiptNumber || !callbackMatchesPayment(parsed, payment))) return new Response(null, { status: 409 });
      if (payment.status !== "pending") return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
      const { error: updateError } = await supabaseAdmin.from("member_contributions").update({
        status: parsed.success ? "paid" : "failed", result_desc: parsed.resultDesc,
        mpesa_receipt: parsed.mpesaReceiptNumber ?? null, paid_at: parsed.success ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", payment.id).eq("status", "pending");
      if (updateError) throw updateError;
      return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch {
      return Response.json({ ResultCode: 1, ResultDesc: "Payment verification unavailable" }, { status: 503 });
    }
  } } },
});