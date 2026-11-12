import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Download, RefreshCw, Printer, ArrowLeft } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { Button } from "@/components/ui/button";
import { OrderReceipt } from "@/components/OrderReceipt";
import { getCustomerOrder, prepareMaterialDownload } from "@/lib/shop/orders.functions";
import { payShopOrder } from "@/lib/shop/shop.functions";
import { orderItems, deliveryLabel, paymentLabel, canDownloadMaterial } from "@/lib/shop/order-rules";
import { kes } from "@/lib/shop/catalog";
import { deliverStudyFile } from "@/lib/shop/download";

const detailQuery = (id: string) => queryOptions({ queryKey: ["customer-order", id], queryFn: () => getCustomerOrder({ data: { order_id: id } }), refetchInterval: (query) => query.state.data?.order.status === "pending" ? 10000 : false });
export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(detailQuery(params.orderId)),
  head: () => ({ meta: [{ title: "Order details and receipt — CCAK" }, { name: "description", content: "Private order details, payment confirmation, shipping and purchased study materials." }, { property: "og:title", content: "Order details and receipt — CCAK" }, { property: "og:description", content: "CCAK order status, authorised receipt and purchased materials." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: OrderDetail,
  errorComponent: () => <PortalShell><h1>Order unavailable</h1><p>This order could not be loaded for your account. Please return to your orders and try again.</p><Button asChild variant="outline"><Link to="/orders">My orders</Link></Button></PortalShell>,
});
function OrderDetail() {
  const { orderId } = Route.useParams();
  const { data, refetch, isFetching } = useSuspenseQuery(detailQuery(orderId));
  const { order, materials } = data;
  const items = orderItems(order.items);
  const prepare = useServerFn(prepareMaterialDownload);
  const pay = useServerFn(payShopOrder);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<Record<string, { blob: Blob; filename: string }>>({});
  async function payment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const result = await pay({ data: { order_id: orderId, phone: String(new FormData(event.currentTarget).get("phone")) } }); setMessage(result.message); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Payment request failed."); }
    finally { setBusy(false); await refetch(); }
  }
  async function prepareFile(id: string) {
    setBusy(true); setMessage("");
    try {
      const result = await prepare({ data: { order_id: orderId, material_id: id } });
      const response = await fetch(result.url);
      if (!response.ok) throw new Error("File could not be retrieved.");
      const blob = await response.blob();
      if (!blob.size) throw new Error("File is empty. Please contact CCAK.");
      setFiles((current) => ({ ...current, [id]: { blob, filename: result.filename } }));
    } catch (e) { setMessage(e instanceof Error ? e.message : "Download unavailable."); }
    finally { setBusy(false); }
  }
  return <PortalShell><div className="order-screen"><Button asChild variant="ghost"><Link to="/orders"><ArrowLeft />My orders</Link></Button><div className="shop-orders-heading"><h1>Order {order.id.slice(0, 8).toUpperCase()}</h1><Button variant="outline" disabled={isFetching} onClick={() => void refetch()}><RefreshCw />Refresh status</Button></div>
    <p className="shop-test-note">{order.payment_environment === "sandbox" ? "M-Pesa test order · No real money charged · No dispatch or paid material downloads" : "Thank you for supporting CCAK."}</p>
    <div className="order-status-grid"><section><h2>Payment</h2><p>{paymentLabel(order)}</p><strong>{order.amount_kes === null ? "Total awaiting Fargo quote" : kes(order.amount_kes)}</strong>{order.shipping_quote_reference && <p>Fargo quote: {order.shipping_quote_reference}</p>}</section><section><h2>Delivery</h2><p>{deliveryLabel(order)}</p>{order.tracking_reference && <p>Fargo tracking reference: {order.tracking_reference}</p>}{order.delivery_updated_at && <p>Updated {new Date(order.delivery_updated_at).toLocaleString("en-KE")}</p>}</section></div>
    {order.shipping_address && <section className="order-section"><h2>Shipping address</h2><address>{typeof order.shipping_address === "object" && Object.values(order.shipping_address).filter(Boolean).join(" · ")}</address></section>}
    {message && <p role="status" className="portal-msg">{message}</p>}
    {order.status === "ready" && <form onSubmit={payment} className="portal-form shop-payment"><label>M-Pesa phone<input type="tel" name="phone" required minLength={9} maxLength={20} /></label><Button type="submit" className="btn btn-forest" disabled={busy}>{order.payment_environment === "sandbox" ? "Request test payment" : "Pay with M-Pesa"} · {kes(order.amount_kes ?? 0)}</Button></form>}
    {items.some((item) => !item.physical) && <section className="order-section"><h2>Study materials & downloads</h2>{materials.length === 0 && <p>CCAK has not published files for this purchase yet.</p>}{materials.map((material) => <div className="shop-cart-row" key={material.id}><div><h3>{material.title}</h3><p>{material.filename}</p></div>{files[material.id] ? <Button className="btn btn-forest" onClick={() => { const file = files[material.id]; if (file) void deliverStudyFile(file.blob, file.filename).catch(() => setMessage("Download could not be saved. Please try again.")); }}><Download />Download</Button> : <Button variant="outline" disabled={busy || !canDownloadMaterial(order, material.product_id)} onClick={() => void prepareFile(material.id)}><Download />Prepare download</Button>}</div>)}{!canDownloadMaterial(order, "export-course") && <p>Downloads unlock after confirmed live payment. Sandbox payments do not unlock paid files.</p>}</section>}
    <div className="shop-orders-heading order-section"><h2>{order.status === "paid" ? "Receipt" : "Order summary"}</h2><Button variant="outline" onClick={() => window.print()}><Printer />Print / Save PDF</Button></div><p>Choose “Save as PDF” in the print window to save your receipt.</p></div>
    <OrderReceipt order={order} customerName={data.customerName} presidentName={data.presidentName} />
  </PortalShell>;
}