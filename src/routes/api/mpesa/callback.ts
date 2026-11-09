import { createFileRoute } from "@tanstack/react-router";

/**
 * Safaricom STK Push callback endpoint.
 * Must be publicly reachable over HTTPS in production.
 * Uses the service-role client only to mark the matching contribution as paid.
 */
export const Route = createFileRoute("/api/mpesa/callback")({
  server: { handlers: { POST: () => Response.json({ ResultCode: 1, ResultDesc: "Use the public payment callback endpoint" }, { status: 410 }) } },
});
