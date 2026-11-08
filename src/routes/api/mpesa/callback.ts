import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseStkCallback } from "@/lib/payments/daraja";

/**
 * Safaricom STK Push callback endpoint.
 * Must be publicly reachable over HTTPS in production.
 * Uses the service-role client only to mark the matching contribution as paid.
 */
export const APIRoute = createAPIFileRoute("/api/mpesa/callback")({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const parsed = parseStkCallback(body);

      const url = process.env["SUPABASE_URL"];
      const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
      if (!url || !serviceKey) {
        console.error("[mpesa/callback] Missing Supabase service credentials");
        return Response.json({ ResultCode: 1, ResultDesc: "Server misconfigured" }, { status: 500 });
      }

      const admin = createClient<Database>(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      if (parsed.success) {
        const { error } = await admin
          .from("member_contributions")
          .update({
            status: "paid",
            mpesa_receipt: parsed.mpesaReceiptNumber ?? null,
            result_desc: parsed.resultDesc,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("checkout_request_id", parsed.checkoutRequestId)
          .eq("status", "pending");

        if (error) {
          console.error("[mpesa/callback] update failed", error);
        }
      } else {
        await admin
          .from("member_contributions")
          .update({
            status: "failed",
            result_desc: parsed.resultDesc,
            updated_at: new Date().toISOString(),
          })
          .eq("checkout_request_id", parsed.checkoutRequestId)
          .eq("status", "pending");
      }

      // Always acknowledge Safaricom quickly
      return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (err) {
      console.error("[mpesa/callback]", err);
      return Response.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 });
    }
  },
});
