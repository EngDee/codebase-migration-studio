import { z } from "zod";

export const orderItemsSchema = z.array(z.object({ id: z.string(), name: z.string(), quantity: z.number().int().positive(), unit_price_kes: z.number().int().nonnegative(), physical: z.boolean() }));
export const orderItems = (input: unknown) => orderItemsSchema.parse(input);
export function canDownloadMaterial(order: { status: string; payment_environment: string; items: unknown }, productId: string) {
  return order.status === "paid" && order.payment_environment === "production" && orderItems(order.items).some((item) => item.id === productId && !item.physical);
}
export function deliveryLabel(order: { items: unknown; payment_environment: string; delivery_status: string }) {
  if (!orderItems(order.items).some((item) => item.physical)) return "Digital order · No shipping";
  if (order.payment_environment === "sandbox") return "Test order · Not dispatched";
  return ({ not_dispatched: "Not dispatched", preparing: "Preparing for delivery", dispatched: "Dispatched", delivered: "Delivered" } as Record<string, string>)[order.delivery_status] ?? "Not dispatched";
}
export function paymentLabel(order: { status: string; payment_environment: string }) {
  const labels: Record<string, string> = { awaiting_quote: "Awaiting delivery quote", ready: "Awaiting payment", pending: "Awaiting Safaricom confirmation", paid: "Payment confirmed", failed: "Payment failed" };
  return `${order.payment_environment === "sandbox" ? "Test · " : ""}${labels[order.status] ?? "Payment not confirmed"}`;
}