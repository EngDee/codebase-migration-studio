import { forwardRef, useEffect, useState, type FormEvent, type ComponentPropsWithoutRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getShopQuoteRequests, saveShopQuote, saveStandardShipping } from "@/lib/shop/shop.functions";
import { kes } from "@/lib/shop/catalog";
import { STANDARD_PARCEL_FEE_KES } from "@/lib/shop/shipping";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { ShopFulfilment } from "./ShopFulfilment";

export interface ShopDeliveryQuotesProps extends ComponentPropsWithoutRef<"section"> {}

export const ShopDeliveryQuotes = forwardRef<HTMLElement, ShopDeliveryQuotesProps>(function ShopDeliveryQuotes({ className, ...props }, ref) {
  const fetchQuotes = useServerFn(getShopQuoteRequests);
  const saveQuote = useServerFn(saveShopQuote);
  const saveStandard = useServerFn(saveStandardShipping);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof getShopQuoteRequests>>>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => { try { setOrders(await fetchQuotes()); } catch { setMessage("Could not load quote requests."); } };
  useEffect(() => { void load(); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>, orderId: string, kind: "member" | "guest") => {
    event.preventDefault(); setBusy(true);
    const values = new FormData(event.currentTarget);
    try { await saveQuote({ data: { order_id: orderId, kind, fee_kes: Number(values.get("fee")), quote_reference: String(values.get("reference")) } }); setMessage("Delivery quote saved. The customer can now pay the confirmed total."); await load(); }
    catch { setMessage("Quote was not saved. Confirm permissions and quote details."); }
    finally { setBusy(false); }
  };
  const standard = async (event: FormEvent<HTMLFormElement>, orderId: string, kind: "member" | "guest") => {
    event.preventDefault(); setBusy(true);
    const weight = Number(new FormData(event.currentTarget).get("weight"));
    try { await saveStandard({ data: { order_id: orderId, kind, weight_kg: weight } }); setMessage("Standard delivery fee saved: KES 350. The customer can now pay the confirmed total."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Delivery fee was not saved."); }
    finally { setBusy(false); }
  };
  return <section ref={ref} className={cn(className)} {...props}><div className="shop-orders-heading"><h2>Fargo delivery quotes</h2><Button variant="outline" disabled={busy} onClick={load}><RefreshCw />Refresh</Button></div>{message && <p role="status">{message}</p>}{orders.length === 0 && <p>No orders awaiting a delivery quote.</p>}{orders.map((order) => <article className="shop-order" key={`${order.kind}-${order.id}`}>
    <h3>Order {order.id.slice(0, 8).toUpperCase()} · {kes(order.subtotal_kes)}</h3>
    <p>{order.shipping_address && typeof order.shipping_address === "object" ? Object.values(order.shipping_address).filter(Boolean).join(" · ") : "No address"}</p>
    <p>{order.kind === "guest" ? "Guest order" : "Member order"}</p>
    <form className="portal-form" onSubmit={(event) => standard(event, order.id, order.kind)}><label>Verified packed parcel weight (kg)<input name="weight" type="number" min="0.001" max="4.999" step="0.001" required /></label><Button type="submit" className="btn btn-forest" disabled={busy}>Apply standard fee · {kes(STANDARD_PARCEL_FEE_KES)}</Button></form>
    <form className="portal-form" onSubmit={(event) => submit(event, order.id, order.kind)}><label>Confirmed Fargo charge for other parcels (KES)<input name="fee" type="number" min="0" max="1000000" step="1" required /></label><label>Fargo quote reference<input name="reference" minLength={3} maxLength={200} required /></label><Button type="submit" className="btn btn-forest" disabled={busy}>Save confirmed quote</Button></form>
  </article>)}<ShopFulfilment /></section>;
});