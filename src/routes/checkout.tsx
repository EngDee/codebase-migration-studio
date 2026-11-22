import { CryptoPayment } from "@/components/payments/CryptoPayment";
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
import { automaticDelivery, isKenya } from "@/lib/shop/shipping";
import { COUNTIES } from "@/lib/members";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [
    { title: "Harvest checkout — CCAK" }, { name: "description", content: "Your CCAK coffee and merchandise order, county-based Kenyan delivery and M-Pesa payment." },
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
  const [country, setCountry] = useState("Kenya");
  const [county, setCounty] = useState("Nairobi");
  const rows = cart.items.map((item) => ({ ...item, product: PRODUCTS.find((product) => product.id === item.id) })).filter((row) => row.product);
  const subtotal = rows.reduce((sum, row) => sum + (row.product?.price ?? 0) * row.quantity, 0);
  const needsShipping = rows.some((row) => row.product?.physical);
  const delivery = automaticDelivery(rows.map((row) => ({ id: row.id, quantity: row.quantity, physical: row.product?.physical ?? false })), { country, county });
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
      setMessage(delivery.fee !== null ? "Thank you for supporting CCAK! Your order is saved and ready for an M-Pesa payment." : delivery.reason === "missing_weight" ? "Your order is saved. CCAK must configure product delivery weights before the delivery fee can be calculated." : "Your order is saved. International delivery requires a courier quote before payment.");
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
      <h1>Harvest checkout</h1>
      {message && <p className="portal-msg" role="status">{message}</p>}{error && <p className="portal-msg" role="alert">{error}</p>}
      {rows.length > 0 ? <div className="shop-checkout-grid">
        <section aria-labelledby="cart-title"><h2 id="cart-title">Your cart</h2>{rows.map((row) => <div className="shop-cart-row" key={row.id}>
          <div><h3>{row.product?.name}</h3><p>{row.product?.quantity_description}</p><p>{kes(row.product?.price ?? 0)} each</p><strong>{kes((row.product?.price ?? 0) * row.quantity)}</strong></div>
          <div className="shop-quantity"><Button variant="outline" size="icon" aria-label={`Decrease ${row.product?.name}`} onClick={() => cart.quantity(row.id, row.quantity - 1)}><Minus /></Button><span>{row.quantity}</span><Button variant="outline" size="icon" aria-label={`Increase ${row.product?.name}`} disabled={row.quantity >= 20} onClick={() => cart.quantity(row.id, row.quantity + 1)}><Plus /></Button><Button variant="ghost" size="icon" aria-label={`Remove ${row.product?.name}`} onClick={() => cart.quantity(row.id, 0)}><Trash2 /></Button></div>
        </div>)}<dl className="shop-totals"><div><dt>Items subtotal</dt><dd>{kes(subtotal)}</dd></div>{needsShipping && delivery.weightKg !== null && <div><dt>Delivery weight</dt><dd>{delivery.weightKg.toLocaleString("en-KE", { maximumFractionDigits: 3 })} kg</dd></div>}<div><dt>Delivery from Nairobi</dt><dd>{!needsShipping ? "Not applicable" : delivery.fee !== null ? kes(delivery.fee) : delivery.reason === "missing_weight" ? "Awaiting product weights" : "International quote required"}</dd></div><div><dt>Total</dt><dd>{delivery.fee === null ? "Delivery not yet calculated" : kes(subtotal + delivery.fee)}</dd></div></dl></section>
        <section><h2>{needsShipping ? "Shipping address" : "Confirm order"}</h2><form onSubmit={submit} className="portal-form">
          {!signedIn && <><h3>Guest checkout</h3><label>Buyer full name<input name="customer_name" autoComplete="name" required minLength={2} maxLength={120} /></label><label>Email for your order<input name="customer_email" type="email" autoComplete="email" required maxLength={255} /></label></>}
          {needsShipping && <><label>Country<input name="country" required maxLength={80} value={country} onChange={(event) => setCountry(event.target.value)} /></label>{isKenya(country) && <label>Delivery county<select name="county" required value={county} onChange={(event) => setCounty(event.target.value)}>{COUNTIES.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>}{[["full_name", "Recipient full name"], ["phone", "Delivery phone"], ["city", "City / town"], ["address", "Street address / building"], ["postal_code", "Postal code (optional)"]].map(([name, label]) => <label key={name}>{label}<input name={name} required={name !== "postal_code"} maxLength={name === "address" ? 300 : 120} /></label>)}<p>CCAK delivery below 5 kg: KES 350 to Nairobi or Kiambu; KES 500 to other Kenyan counties. At 5 kg or above: KES 1,000 nationwide. International delivery is quoted separately.</p></>}
          <Button className="btn btn-forest" type="submit" disabled={busy || !requestKey}><ShoppingBag />{busy ? "Saving…" : "Save order"}</Button>
        </form></section>
      </div> : <p className="shop-empty">Your cart is empty. <Link to="/">Browse the harvest shop</Link></p>}
      {signedIn && <section className="shop-orders"><div className="shop-orders-heading"><h2>Your saved orders</h2><Button asChild variant="outline"><Link to="/orders">My orders</Link></Button><Button variant="outline" disabled={busy} onClick={load}><RefreshCw />Refresh status</Button></div>
        {orders.length === 0 && <p>No orders yet.</p>}{orders.map((order) => <article className="shop-order" key={order.id}><h3>Order {order.id.slice(0, 8).toUpperCase()}</h3><p>Status: {order.payment_environment === "sandbox" ? "Test · " : ""}{order.status.replace(/_/g, " ")}</p><p>Items: {kes(order.subtotal_kes)} · Delivery: {order.shipping_kes === null ? "Awaiting Fargo quote" : kes(order.shipping_kes)}</p><strong>Total: {order.amount_kes === null ? "Awaiting quote" : kes(order.amount_kes)}</strong>
          <Button asChild variant="outline"><Link to="/orders/$orderId" params={{ orderId: order.id }}>Order details & receipt</Link></Button>
          {order.shipping_quote_reference && <p>Delivery reference: {order.shipping_quote_reference}</p>}
          {order.status === "ready" && <form className="portal-form shop-payment" onSubmit={(event) => startPayment(event, order.id)}><label>M-Pesa phone<input name="phone" type="tel" placeholder="07XX XXX XXX" required minLength={9} maxLength={20} /></label><Button type="submit" className="btn btn-forest" disabled={busy}>{order.payment_environment === "sandbox" ? "Request test M-Pesa payment" : "Pay with M-Pesa"} · {kes(order.amount_kes ?? 0)}</Button></form>}
          {order.status === "ready" && order.payment_environment === "production" && <CryptoPayment amountKes={order.amount_kes ?? 0} purpose="shop_order" reference={order.id} />}
          {order.status === "pending" && <p>Waiting for Safaricom confirmation. Refresh status to check the result.</p>}
          {order.status === "paid" && <p>{order.payment_environment === "sandbox" ? "Test payment confirmed; no dispatch will take place." : "Thank you for supporting our coffee community and the CCAK mission! Your payment is confirmed."}</p>}
          {order.status === "failed" && <p>Payment was not confirmed. Contact CCAK before placing a replacement order.</p>}
        </article>)}
      </section>}
    </main></div>;
}