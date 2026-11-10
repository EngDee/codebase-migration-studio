import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getShopFulfilment, publishShopMaterial, updateShopDelivery } from "@/lib/shop/orders.functions";
import { orderItems, deliveryLabel } from "@/lib/shop/order-rules";

export function ShopFulfilment() {
  const fetchData = useServerFn(getShopFulfilment);
  const publish = useServerFn(publishShopMaterial);
  const update = useServerFn(updateShopDelivery);
  const [data, setData] = useState<Awaited<ReturnType<typeof getShopFulfilment>>>({ orders: [], materials: [] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() { try { setData(await fetchData()); } catch { setMessage("Could not load materials and deliveries."); } }
  useEffect(() => { void load(); }, []);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const file = values.get("file");
    if (!(file instanceof File) || !file.size || file.size > 50 * 1024 * 1024 || file.type !== "application/pdf") { setMessage("Choose a PDF study file up to 50 MB."); return; }
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
    const path = `export-course/${crypto.randomUUID()}/${filename}`;
    setBusy(true); setMessage("");
    try {
      const result = await supabase.storage.from("shop-materials").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (result.error) throw new Error("File upload failed. Confirm national administrator access.");
      try { await publish({ data: { material_product: "export-course", material_title: String(values.get("title")), material_path: path, material_filename: filename } }); }
      catch (e) { await supabase.storage.from("shop-materials").remove([path]); throw e; }
      form.reset(); setMessage("Study material published. Only confirmed live purchasers can download it."); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Material could not be saved."); }
    finally { setBusy(false); }
  }
  async function saveDelivery(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault(); const values = new FormData(event.currentTarget); const status = String(values.get("status"));
    if (status !== "preparing" && status !== "dispatched" && status !== "delivered") return;
    setBusy(true);
    try { await update({ data: { order_id: orderId, new_status: status, tracking: String(values.get("tracking")) } }); setMessage("Delivery status saved."); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Delivery update failed."); }
    finally { setBusy(false); }
  }
  return <section className="order-section"><div className="shop-orders-heading"><h2>Study materials & deliveries</h2><Button variant="outline" disabled={busy} onClick={() => void load()}><RefreshCw />Refresh</Button></div>{message && <p role="status" className="portal-msg">{message}</p>}
    <h3>Export readiness course · PDF study materials</h3><form className="portal-form shop-payment" onSubmit={upload}><label>Material title<input name="title" required minLength={2} maxLength={160} /></label><label>Study file (PDF, maximum 50 MB)<input name="file" type="file" accept="application/pdf" required /></label><Button type="submit" disabled={busy} className="btn btn-forest"><Upload />Publish material</Button></form>
    {data.materials.map((material) => <p key={material.id}>{material.title} · {material.filename}</p>)}
    <h3 className="order-section">Live paid deliveries</h3>{data.orders.filter((order) => orderItems(order.items).some((item) => item.physical)).length === 0 && <p>No live paid orders awaiting fulfilment. Test orders cannot be dispatched.</p>}
    {data.orders.filter((order) => orderItems(order.items).some((item) => item.physical)).map((order) => <article className="shop-order" key={order.id}><h3>Order {order.id.slice(0, 8).toUpperCase()}</h3><p>{deliveryLabel(order)}</p><p>{order.shipping_address && typeof order.shipping_address === "object" ? Object.values(order.shipping_address).filter(Boolean).join(" · ") : "No address"}</p><form className="portal-form shop-payment" onSubmit={(event) => void saveDelivery(event, order.id)}><label>Delivery status<select name="status" defaultValue={order.delivery_status === "not_dispatched" ? "preparing" : order.delivery_status}><option value="preparing">Preparing</option><option value="dispatched">Dispatched</option><option value="delivered">Delivered</option></select></label><label>Fargo tracking reference<input name="tracking" maxLength={200} defaultValue={order.tracking_reference ?? ""} /></label><Button type="submit" disabled={busy} className="btn btn-forest">Save delivery status</Button></form></article>)}
  </section>;
}