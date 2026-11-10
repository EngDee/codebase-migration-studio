import { createFileRoute } from "@tanstack/react-router";
import { parseStkCallback, queryStkResult, requireDarajaConfiguration } from "@/lib/payments/daraja";
import { callbackMatchesPayment } from "@/lib/payments/rules";
import { requireShopTestMode } from "@/lib/shop/catalog";

export const Route = createFileRoute("/api/public/shop/mpesa/callback")({
  server: { handlers: { POST: async ({ request }) => {
    let parsed;
    try {
      const text = await request.text();
      if (text.length > 16000) return new Response(null, { status: 413 });
      parsed = parseStkCallback(JSON.parse(text));
    } catch { return Response.json({ error: "Invalid payload" }, { status: 400 }); }
    try {
      requireShopTestMode(process.env["DARAJA_ENV"]);
      requireDarajaConfiguration();
      const confirmed = await queryStkResult(parsed.checkoutRequestId);
      if (confirmed !== parsed.resultCode) return new Response(null, { status: 409 });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: order, error } = await supabaseAdmin.from("shop_orders").select("*").eq("checkout_request_id", parsed.checkoutRequestId).maybeSingle();
      if (error) throw error;
      if (!order || order.merchant_request_id !== parsed.merchantRequestId || order.payment_environment !== "sandbox") return new Response(null, { status: 404 });
      if (parsed.success && (!parsed.mpesaReceiptNumber || !order.phone || !order.amount_kes || !callbackMatchesPayment(parsed, { ...order, phone: order.phone, amount_kes: order.amount_kes }))) return new Response(null, { status: 409 });
      if (order.status !== "pending") return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
      const { error: updateError } = await supabaseAdmin.from("shop_orders").update({ status: parsed.success ? "paid" : "failed", mpesa_receipt: parsed.mpesaReceiptNumber ?? null, paid_at: parsed.success ? new Date().toISOString() : null }).eq("id", order.id).eq("status", "pending");
      if (updateError) throw updateError;
      return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch { return Response.json({ error: "Payment verification unavailable" }, { status: 503 }); }
  } } },
});