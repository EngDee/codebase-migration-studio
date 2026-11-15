import { createFileRoute } from "@tanstack/react-router";
import { parseStkCallback, queryStkResult, requireDarajaConfiguration } from "@/lib/payments/daraja";
import { callbackMatchesPayment } from "@/lib/payments/rules";
import { requireShopPaymentMode } from "@/lib/shop/catalog";

export const Route = createFileRoute("/api/public/donate/mpesa/callback")({
  server: { handlers: { POST: async ({ request }) => {
    let parsed;
    try {
      const text = await request.text();
      if (text.length > 16000) return new Response(null, { status: 413 });
      parsed = parseStkCallback(JSON.parse(text));
    } catch { return Response.json({ error: "Invalid payload" }, { status: 400 }); }
    try {
      const environment = requireShopPaymentMode(process.env["DARAJA_ENV"]);
      requireDarajaConfiguration();
      // Callbacks alone are not trusted: confirm the result with Safaricom.
      const confirmed = await queryStkResult(parsed.checkoutRequestId);
      if (confirmed !== parsed.resultCode) return new Response(null, { status: 409 });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: d, error } = await supabaseAdmin.from("donations").select("*").eq("checkout_request_id", parsed.checkoutRequestId).maybeSingle();
      if (error) throw error;
      if (!d || d.merchant_request_id !== parsed.merchantRequestId || d.payment_environment !== environment) return new Response(null, { status: 404 });
      if (parsed.success && (!parsed.mpesaReceiptNumber || !callbackMatchesPayment(parsed, d))) return new Response(null, { status: 409 });
      if (d.status !== "pending") return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
      const { error: updateError } = await supabaseAdmin.from("donations").update({ status: parsed.success ? "paid" : "failed", mpesa_receipt: parsed.mpesaReceiptNumber ?? null, paid_at: parsed.success ? new Date().toISOString() : null }).eq("id", d.id).eq("status", "pending");
      if (updateError) throw updateError;
      return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch { return Response.json({ error: "Payment verification unavailable" }, { status: 503 }); }
  } } },
});
