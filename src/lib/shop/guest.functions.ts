import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { guestCheckoutSchema } from "./guest-rules";
import { priceCart, requireShopTestMode } from "./catalog";
import { guestSession } from "./guest-session.server";
import { initiateStkPush, normaliseMpesaPhone, requireDarajaConfiguration } from "@/lib/payments/daraja";
import { orderItems, canDownloadMaterial } from "./order-rules";

export const createGuestOrder = createServerFn({ method: "POST" }).inputValidator((input: unknown) => guestCheckoutSchema.parse(input)).handler(async ({ data }) => {
  const hash = await guestSession(true);
  const priced = priceCart(data.items);
  if (priced.needsShipping && !data.shipping) throw new Error("Delivery address is required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const previous = await supabaseAdmin.from("guest_shop_orders").select("id").eq("request_key", data.request_key).eq("guest_session_hash", hash).maybeSingle();
  if (previous.error) throw new Error("Could not check your order.");
  if (previous.data) return previous.data;
  const recent = await supabaseAdmin.from("guest_shop_orders").select("id", { count: "exact", head: true }).eq("guest_session_hash", hash).gte("created_at", new Date(Date.now() - 3600000).toISOString());
  if (recent.error || (recent.count ?? 0) >= 10) throw new Error("Please wait before placing more orders, or contact CCAK.");
  const result = await supabaseAdmin.from("guest_shop_orders").insert({ guest_session_hash: hash, request_key: data.request_key, customer_name: data.customer_name, customer_email: data.customer_email, items: priced.items, subtotal_kes: priced.subtotal, shipping_address: data.shipping ?? null, shipping_kes: priced.needsShipping ? null : 0, amount_kes: priced.needsShipping ? null : priced.subtotal, status: priced.needsShipping ? "awaiting_quote" : "ready" }).select("id").single();
  if (result.error || !result.data) throw new Error("Order was not saved. Please try again.");
  return result.data;
});
export const getGuestOrder = createServerFn({ method: "POST" }).inputValidator((input: unknown) => z.object({ order_id: z.string().uuid() }).parse(input)).handler(async ({ data }) => {
  const hash = await guestSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.from("guest_shop_orders").select("*").eq("id", data.order_id).eq("guest_session_hash", hash).maybeSingle();
  if (result.error || !result.data) throw new Error("Order unavailable in this browser. Contact CCAK with your order reference.");
  const { guest_session_hash: _hash, request_key: _key, ...order } = result.data;
  const ids = orderItems(order.items).filter((item) => !item.physical).map((item) => item.id);
  const materials = await supabaseAdmin.from("shop_materials").select("id,product_id,title,filename").in("product_id", ids);
  if (materials.error) throw new Error("Materials could not be loaded.");
  return { order, materials: materials.data, presidentName: process.env["CCAK_PRESIDENT_NAME"] || "David Muigai Miringu" };
});
export const payGuestOrder = createServerFn({ method: "POST" }).inputValidator((input: unknown) => z.object({ order_id: z.string().uuid(), phone: z.string().min(9).max(20) }).parse(input)).handler(async ({ data }) => {
  const hash = await guestSession();
  requireShopTestMode(process.env["DARAJA_ENV"]); requireDarajaConfiguration();
  const phone = normaliseMpesaPhone(data.phone);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.from("guest_shop_orders").select("*").eq("id", data.order_id).eq("guest_session_hash", hash).maybeSingle();
  const order = result.data;
  if (result.error || !order || order.status !== "ready" || !order.amount_kes) throw new Error("A confirmed order total is required before payment.");
  const claimed = await supabaseAdmin.from("guest_shop_orders").update({ status: "pending", phone }).eq("id", order.id).eq("guest_session_hash", hash).eq("status", "ready").select("id").maybeSingle();
  if (claimed.error || !claimed.data) throw new Error("Payment is already in progress.");
  try {
    const origin = process.env["PUBLIC_APP_URL"] || "https://codebase-migration-studio.lovable.app";
    const stk = await initiateStkPush({ amount: order.amount_kes, phone, accountReference: `GUEST${order.id.replace(/-/g, "").slice(0, 7)}`, transactionDesc: "CCAK shop", callbackUrl: `${origin.replace(/\/+$/, "")}/api/public/shop/mpesa/callback` });
    const attached = await supabaseAdmin.from("guest_shop_orders").update({ checkout_request_id: stk.checkoutRequestId, merchant_request_id: stk.merchantRequestId }).eq("id", order.id).eq("status", "pending");
    if (attached.error) throw new Error("Payment tracking failed.");
    return { message: "Safaricom accepted the test payment request. No real money is charged." };
  } catch { await supabaseAdmin.from("guest_shop_orders").update({ status: "failed" }).eq("id", order.id).eq("status", "pending"); throw new Error("Test payment could not be started. Contact CCAK before trying again."); }
});
export const prepareGuestMaterial = createServerFn({ method: "POST" }).inputValidator((input: unknown) => z.object({ order_id: z.string().uuid(), material_id: z.string().uuid() }).parse(input)).handler(async ({ data }) => {
  const hash = await guestSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const order = await supabaseAdmin.from("guest_shop_orders").select("*").eq("id", data.order_id).eq("guest_session_hash", hash).maybeSingle();
  const material = await supabaseAdmin.from("shop_materials").select("*").eq("id", data.material_id).maybeSingle();
  if (order.error || material.error || !order.data || !material.data || !canDownloadMaterial(order.data, material.data.product_id)) throw new Error("Confirmed live payment is required for paid downloads. Test payments do not unlock files.");
  const signed = await supabaseAdmin.storage.from("shop-materials").createSignedUrl(material.data.storage_path, 60, { download: material.data.filename });
  if (signed.error || !signed.data) throw new Error("Study file unavailable.");
  return { url: signed.data.signedUrl, filename: material.data.filename };
});