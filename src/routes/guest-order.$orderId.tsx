import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { OrderReceipt } from "@/components/OrderReceipt";
import { getGuestOrder, payGuestOrder, prepareGuestMaterial } from "@/lib/shop/guest.functions";
import { canDownloadMaterial, deliveryLabel, paymentLabel, orderItems } from "@/lib/shop/order-rules";
import { deliverStudyFile } from "@/lib/shop/download";
import { kes } from "@/lib/shop/catalog";
import { RefreshCw, Printer, Download } from "lucide-react";
import logo from "@/assets/ccak-logo.png.asset.json";
const guestQuery = (id: string) => queryOptions({ queryKey: ["guest-order", id], queryFn: () => getGuestOrder({ data: { order_id: id } }), refetchInterval: (query) => query.state.data?.order.status === "pending" ? 10000 : false });
export const Route = createFileRoute("/guest-order/$orderId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(guestQuery(params.orderId)),
  head: () => ({ meta: [{ title: "Guest order and receipt — CCAK" }, { name: "description", content: "Review your private CCAK guest order, payment and delivery status without an account." }, { property: "og:title", content: "Guest order and receipt — CCAK" }, { property: "og:description", content: "Private CCAK guest purchase details and receipt." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: GuestOrder,
  errorComponent: () => <div className="portal"><main className="portal-main"><h1>Order unavailable</h1><p>Open this order in the same browser used at checkout, or contact CCAK with your order reference.</p><Button asChild variant="outline"><Link to="/checkout">Back to checkout</Link></Button></main></div>,
});
function GuestOrder() {
  const { orderId } = Route.useParams();
  const { data, refetch, isFetching } = useSuspenseQuery(guestQuery(orderId));
  const { order, materials } = data;
  const pay = useServerFn(payGuestOrder); const prepare = useServerFn(prepareGuestMaterial);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const [files, setFiles] = useState<Record<string, { blob: Blob; filename: string }>>({});
  async function payment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const phone = String(new FormData(e.currentTarget).get("phone")); setBusy(true);
    try { setMessage((await pay({ data: { order_id: orderId, phone } })).message); } catch (error) { setMessage(error instanceof Error ? error.message : "Payment failed."); }
    finally { setBusy(false); await refetch(); }
  }
  async function file(id: string) {
    setBusy(true); try { const signed = await prepare({ data: { order_id: orderId, material_id: id } }); const response = await fetch(signed.url); if (!response.ok) throw new Error("File unavailable."); const blob = await response.blob(); if (!blob.size) throw new Error("File is empty."); setFiles((current) => ({ ...current, [id]: { blob, filename: signed.filename } })); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Download unavailable."); } finally { setBusy(false); }
  }
  return <div className="portal shop-page"><header className="portal-top"><Link to="/"><img className="logo-mark" src={logo.url} alt="CCAK logo" /></Link><Button asChild variant="outline"><Link to="/">Continue shopping</Link></Button></header><main className="portal-main"><div className="order-screen"><div className="shop-orders-heading"><h1>Order {order.id.slice(0,8).toUpperCase()}</h1><Button variant="outline" disabled={isFetching} onClick={() => void refetch()}><RefreshCw />Refresh status</Button></div>
    <p>Thank you, {order.customer_name}, for supporting the CCAK mission!</p>{order.payment_environment === "sandbox" && <p className="shop-test-note">Historical test order · No dispatch or paid downloads</p>}<p>Keep this order reference and use this browser to review your order.</p>
    <div className="order-status-grid"><section><h2>Payment</h2><p>{paymentLabel(order)}</p><strong>{order.amount_kes === null ? "Total awaiting Fargo quote" : kes(order.amount_kes)}</strong>{order.shipping_quote_reference && <p>Fargo quote: {order.shipping_quote_reference}</p>}</section><section><h2>Delivery</h2><p>{deliveryLabel(order)}</p></section></div>
    {order.shipping_address && <section><h2>Shipping address</h2><address>{typeof order.shipping_address === "object" && Object.values(order.shipping_address).filter(Boolean).join(" · ")}</address></section>}
    {message && <p className="portal-msg" role="status">{message}</p>}
    {order.status === "ready" && <form className="portal-form shop-payment" onSubmit={payment}><label>M-Pesa phone<input type="tel" name="phone" minLength={9} maxLength={20} required /></label><Button type="submit" className="btn btn-forest" disabled={busy}>{order.payment_environment === "sandbox" ? "Request test payment" : "Pay with M-Pesa"} · {kes(order.amount_kes ?? 0)}</Button></form>}
    {orderItems(order.items).some((item) => !item.physical) && <section className="order-section"><h2>Study materials</h2>{materials.length === 0 && <p>No files published for this purchase yet.</p>}{materials.map((material) => <div className="shop-cart-row" key={material.id}><h3>{material.title}</h3>{files[material.id] ? <Button onClick={() => { const f = files[material.id]; if (f) void deliverStudyFile(f.blob,f.filename).catch(() => setMessage("File could not be saved.")); }}><Download />Download</Button> : <Button variant="outline" disabled={busy || !canDownloadMaterial(order,material.product_id)} onClick={() => void file(material.id)}><Download />Prepare download</Button>}</div>)}<p>Paid files require confirmed live payment; sandbox payments do not unlock them.</p></section>}
    <div className="shop-orders-heading order-section"><h2>Order summary & receipt</h2><Button variant="outline" onClick={() => window.print()}><Printer />Print / Save PDF</Button></div></div><OrderReceipt order={order} customerName={order.customer_name} presidentName={data.presidentName} /></main></div>;
}