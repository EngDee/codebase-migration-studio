import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getShopQuoteRequests, saveShopQuote } from "@/lib/shop/shop.functions";
import { kes } from "@/lib/shop/catalog";
import { RefreshCw } from "lucide-react";

export function ShopDeliveryQuotes() {
  const fetchQuotes = useServerFn(getShopQuoteRequests);
  const saveQuote = useServerFn(saveShopQuote);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof getShopQuoteRequests>>>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => { try { setOrders(await fetchQuotes()); } catch { setMessage("Could not load quote requests."); } };
  useEffect(() => { void load(); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>, orderId: string) => {
    event.preventDefault(); setBusy(true);
    const values = new FormData(event.currentTarget);
    try { await saveQuote({ data: { order_id: orderId, fee_kes: Number(values.get("fee")), quote_reference: String(values.get("reference")) } }); setMessage("Fargo quote saved. The customer can now request a test payment for the full total."); await load(); }
    catch { setMessage("Quote was not saved. Confirm permissions and quote details."); }
    finally { setBusy(false); }
  };
  return <section><div className="shop-orders-heading"><h2>Fargo delivery quotes</h2><Button variant="outline" onClick={load}><RefreshCw />Refresh</Button></div>{message && <p role="status">{message}</p>}{orders.length === 0 && <p>No orders awaiting a delivery quote.</p>}{orders.map((order) => <article className="shop-order" key={order.id}>
    <h3>Order {order.id.slice(0, 8).toUpperCase()} · {kes(order.subtotal_kes)}</h3>
    <p>{order.shipping_address && typeof order.shipping_address === "object" ? Object.values(order.shipping_address).filter(Boolean).join(" · ") : "No address"}</p>
    <form className="portal-form" onSubmit={(event) => submit(event, order.id)}><label>Confirmed Fargo charge (KES)<input name="fee" type="number" min="0" max="1000000" step="1" required /></label><label>Fargo quote reference<input name="reference" minLength={3} maxLength={200} required /></label><Button type="submit" className="btn btn-forest" disabled={busy}>Save confirmed quote</Button></form>
  </article>)}</section>;
}