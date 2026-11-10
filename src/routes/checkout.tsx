import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { Minus, Plus, Trash2, ShoppingBag, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShopCart } from "@/components/ShopCart";
import { PRODUCTS, kes, addressSchema } from "@/lib/shop/catalog";
import { createShopOrder, getShopOrders, payShopOrder } from "@/lib/shop/shop.functions";
import { supabase } from "@/integrations/supabase/client";
import ccakLogo from "@/assets/ccak-logo.png.asset.json";
import { createGuestOrder } from "@/lib/shop/guest.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [
    { title: "Harvest checkout — CCAK" }, { name: "description", content: "Your CCAK coffee and merchandise order, Fargo delivery quote and M-Pesa test payment." },
    { property: "og:title", content: "Harvest checkout — CCAK" }, { property: "og:description", content: "Coffee, merchandise and training from the Coffee Champions Association of Kenya." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Checkout,
});

function Checkout() {
  const navigate = useNavigate();
  const cart = useShopCart();
  const createOrder = useServerFn(createShopOrder);
  const createGuest = useServerFn(createGuestOrder);
  const fetchOrders = useServerFn(getShopOrders);
  const pay = useServerFn(payShopOrder);
  const [signedIn, setSignedIn] = useState(false);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof getShopOrders>>>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState("");
  const rows = cart.items.map((item) => ({ ...item, product: PRODUCTS.find((product) => product.id === item.id) })).filter((row) => row.product);
  const subtotal = rows.reduce((sum, row) => sum + (row.product?.price ?? 0) * row.quantity, 0);
  const needsShipping = rows.some((row) => row.product?.physical);
  const load = async () => { try { setOrders(await fetchOrders()); } catch { setError("Could not load saved orders. Please try again."); } };
  useEffect(() => {
    setRequestKey(crypto.randomUUID());
    supabase.auth.getUser().then(({ data }) => { if (data.user) { setSignedIn(true); void load(); } });
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const shipping = needsShipping ? addressSchema.safeParse(data) : null;
    if (shipping && !shipping.success) { setError(shipping.error.issues[0]?.message ?? "Check your delivery address."); return; }
    setBusy(true);
    try {
      const orderInput = { items: cart.items, ...(shipping?.success ? { shipping: shipping.data } : {}), request_key: requestKey };
      const saved = signedIn ? await createOrder({ data: orderInput }) : await createGuest({ data: { ...orderInput, customer_name: String(data["customer_name"] ?? ""), customer_email: String(data["customer_email"] ?? "") } });
      cart.clear(); setRequestKey(crypto.randomUUID());
      setMessage(needsShipping ? "Thank you for supporting CCAK! Your order is saved. We will confirm the Fargo delivery quote before requesting payment." : "Thank you for supporting CCAK! Your order is saved and ready for an M-Pesa test payment.");
      if (signedIn) { await load(); await navigate({ to: "/orders/$orderId", params: { orderId: saved.id } }); }
      else { await navigate({ to: "/guest-order/$orderId", params: { orderId: saved.id } }); }
    } catch (e) { setError(e instanceof Error ? e.message : "Order was not saved."); }
    finally { setBusy(false); }
  };
  const startPayment = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const phone = String(new FormData(event.currentTarget).get("phone") ?? "");
    try { const result = await pay({ data: { order_id: id, phone } }); setMessage(result.message); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Payment request failed."); await load(); }
    finally { setBusy(false); }
  };
  return <div className="portal shop-page">
    <header className="portal-top"><Link to="/" className="logo"><img className="logo-mark" src={ccakLogo.url} alt="CCAK logo" /><span className="logo-text"><strong>Coffee Champions</strong><small>Association of Kenya</small></span></Link><Button asChild variant="ghost" className="btn btn-ghost"><Link to="/">Continue shopping</Link></Button></header>
    <main className="portal-main">
      <h1>Harvest checkout</h1><p className="shop-test-note">M-Pesa test mode · No real money charged · Orders are not dispatched during testing</p>
      {message && <p className="portal-msg" role="status">{message}</p>}{error && <p className="portal-msg" role="alert">{error}</p>}
      {rows.length > 0 ? <div className="shop-checkout-grid">
        <section aria-labelledby="cart-title"><h2 id="cart-title">Your cart</h2>{rows.map((row) => <div className="shop-cart-row" key={row.id}>
          <div><h3>{row.product?.name}</h3><p>{kes(row.product?.price ?? 0)} each</p><strong>{kes((row.product?.price ?? 0) * row.quantity)}</strong></div>
          <div className="shop-quantity"><Button variant="outline" size="icon" aria-label={`Decrease ${row.product?.name}`} onClick={() => cart.quantity(row.id, row.quantity - 1)}><Minus /></Button><span>{row.quantity}</span><Button variant="outline" size="icon" aria-label={`Increase ${row.product?.name}`} disabled={row.quantity >= 20} onClick={() => cart.quantity(row.id, row.quantity + 1)}><Plus /></Button><Button variant="ghost" size="icon" aria-label={`Remove ${row.product?.name}`} onClick={() => cart.quantity(row.id, 0)}><Trash2 /></Button></div>
        </div>)}<dl className="shop-totals"><div><dt>Items subtotal</dt><dd>{kes(subtotal)}</dd></div><div><dt>Fargo delivery from Nairobi</dt><dd>{needsShipping ? "Quote required" : "Not applicable"}</dd></div><div><dt>Total</dt><dd>{needsShipping ? "Awaiting courier quote" : kes(subtotal)}</dd></div></dl></section>
        <section><h2>{needsShipping ? "Shipping address" : "Confirm order"}</h2><form onSubmit={submit} className="portal-form">
          {!signedIn && <><h3>Guest checkout</h3><label>Buyer full name<input name="customer_name" autoComplete="name" required minLength={2} maxLength={120} /></label><label>Email for your order<input name="customer_email" type="email" autoComplete="email" required maxLength={255} /></label></>}
          {needsShipping && <>{[["full_name", "Recipient full name"], ["phone", "Delivery phone"], ["country", "Country"], ["city", "City / town"], ["address", "Street address / building"], ["postal_code", "Postal code (optional)"]].map(([name, label]) => <label key={name}>{label}<input name={name} required={name !== "postal_code"} maxLength={name === "address" ? 300 : 120} defaultValue={name === "country" ? "Kenya" : undefined} /></label>)}<p>Delivery charge will be confirmed using a Fargo Courier quote for your destination.</p></>}
          <Button className="btn btn-forest" type="submit" disabled={busy || !requestKey}><ShoppingBag />{busy ? "Saving…" : needsShipping ? "Save order & request delivery quote" : "Save order"}</Button>
        </form></section>
      </div> : <p className="shop-empty">Your cart is empty. <Link to="/">Browse the harvest shop</Link></p>}
      {signedIn && <section className="shop-orders"><div className="shop-orders-heading"><h2>Your saved orders</h2><Button asChild variant="outline"><Link to="/orders">My orders</Link></Button><Button variant="outline" disabled={busy} onClick={load}><RefreshCw />Refresh status</Button></div>
        {orders.length === 0 && <p>No orders yet.</p>}{orders.map((order) => <article className="shop-order" key={order.id}><h3>Order {order.id.slice(0, 8).toUpperCase()}</h3><p>Status: {order.status === "paid" ? "Test payment confirmed" : order.status.replace(/_/g, " ")}</p><p>Items: {kes(order.subtotal_kes)} · Delivery: {order.shipping_kes === null ? "Awaiting Fargo quote" : kes(order.shipping_kes)}</p><strong>Total: {order.amount_kes === null ? "Awaiting quote" : kes(order.amount_kes)}</strong>
          <Button asChild variant="outline"><Link to="/orders/$orderId" params={{ orderId: order.id }}>Order details & receipt</Link></Button>
          {order.shipping_quote_reference && <p>Fargo quote: {order.shipping_quote_reference}</p>}
          {order.status === "ready" && <form className="portal-form shop-payment" onSubmit={(event) => startPayment(event, order.id)}><label>M-Pesa test phone<input name="phone" type="tel" placeholder="07XX XXX XXX" required minLength={9} maxLength={20} /></label><Button type="submit" className="btn btn-forest" disabled={busy}>Request test M-Pesa payment · {kes(order.amount_kes ?? 0)}</Button></form>}
          {order.status === "pending" && <p>Waiting for Safaricom confirmation. Refresh status to check the result.</p>}
          {order.status === "paid" && <p>Thank you for supporting our coffee community and the CCAK mission! Your test payment is confirmed; no dispatch will take place.</p>}
          {order.status === "failed" && <p>Test payment failed. No real money was charged. Contact CCAK before placing a replacement order.</p>}
        </article>)}
      </section>}
    </main></div>;
}