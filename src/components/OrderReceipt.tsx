import type { Tables } from "@/integrations/supabase/types";
import logo from "@/assets/ccak-logo.png.asset.json";
import signature from "@/assets/president-signature.png.asset.json";
import { orderItems } from "@/lib/shop/order-rules";
import { kes } from "@/lib/shop/catalog";

export function OrderReceipt({ order, customerName, presidentName }: { order: Pick<Tables<"shop_orders">, "id" | "status" | "payment_environment" | "created_at" | "paid_at" | "mpesa_receipt" | "items" | "subtotal_kes" | "shipping_kes" | "amount_kes">; customerName: string | null; presidentName: string }) {
  const paid = order.status === "paid";
  return <section className="order-receipt" aria-label="CCAK order receipt">
    <div className="receipt-brand"><img src={logo.url} alt="CCAK logo" /><div><h2>Coffee Champions Association of Kenya</h2><p>{order.payment_environment === "sandbox" ? "TEST ONLY · Not proof of payment" : paid ? "Payment receipt" : "Order summary · Not a payment receipt"}</p></div></div>
    <dl className="shop-totals"><div><dt>Order reference</dt><dd>{order.id.toUpperCase()}</dd></div><div><dt>Customer</dt><dd>{customerName || "CCAK shopper"}</dd></div><div><dt>Order date</dt><dd>{new Date(order.created_at).toLocaleDateString("en-KE")}</dd></div>{paid && <><div><dt>Payment date</dt><dd>{order.paid_at ? new Date(order.paid_at).toLocaleDateString("en-KE") : "Not recorded"}</dd></div><div><dt>M-Pesa reference</dt><dd>{order.mpesa_receipt || "Not recorded"}</dd></div></>}</dl>
    {orderItems(order.items).map((item) => <div className="receipt-line" key={item.id}><span>{item.name} × {item.quantity}</span><strong>{kes(item.unit_price_kes * item.quantity)}</strong></div>)}
    <dl className="shop-totals"><div><dt>Subtotal</dt><dd>{kes(order.subtotal_kes)}</dd></div><div><dt>Delivery</dt><dd>{order.shipping_kes === null ? "Awaiting quote" : kes(order.shipping_kes)}</dd></div><div><dt>Total</dt><dd>{order.amount_kes === null ? "Awaiting quote" : kes(order.amount_kes)}</dd></div></dl>
    <div className="receipt-authority"><img src={signature.url} alt="President's authorising signature" /><strong>{presidentName}</strong><span>National President · Authoriser</span></div><p>Thank you for supporting the CCAK mission and Kenya’s coffee community.</p>
  </section>;
}