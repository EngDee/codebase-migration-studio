import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkoutSchema, priceCart, requireShopPaymentMode } from "./catalog";
import { initiateStkPush, normaliseMpesaPhone, requireDarajaConfiguration } from "@/lib/payments/daraja";
import { standardParcelFee, standardShippingSchema } from "./shipping";

export const createShopOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const environment = requireShopPaymentMode(process.env["DARAJA_ENV"]);
    const priced = priceCart(data.items);
    if (priced.needsShipping && !data.shipping) throw new Error("Delivery address is required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: previous, error: previousError } = await context.supabase.from("shop_orders").select("id").eq("request_key", data.request_key).maybeSingle();
    if (previousError) throw new Error("Could not check your order. Try again.");
    if (previous) return previous;
    const { data: order, error } = await supabaseAdmin.from("shop_orders").insert({
      user_id: context.userId, request_key: data.request_key, items: priced.items,
      subtotal_kes: priced.subtotal, shipping_address: data.shipping ?? null,
      shipping_kes: priced.needsShipping ? null : 0,
      amount_kes: priced.needsShipping ? null : priced.subtotal,
      status: priced.needsShipping ? "awaiting_quote" : "ready",
      payment_environment: environment,
    }).select("id").single();
    if (error || !order) throw new Error("Order was not saved. Please try again.");
    return order;
  });

export const getShopOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data, error } = await context.supabase.from("shop_orders").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(30);
    if (error) throw new Error("Could not load orders.");
    return data;
  });

export const payShopOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ order_id: z.string().uuid(), phone: z.string().min(9).max(20) }).parse(data))
  .handler(async ({ data, context }) => {
    const environment = requireShopPaymentMode(process.env["DARAJA_ENV"]);
    requireDarajaConfiguration();
    const phone = normaliseMpesaPhone(data.phone);
    const { data: order, error } = await context.supabase.from("shop_orders").select("*").eq("id", data.order_id).eq("user_id", context.userId).single();
    if (error || !order || order.status !== "ready" || !order.amount_kes) throw new Error("Order must have a confirmed total before payment.");
    if (order.payment_environment !== environment) throw new Error("This order belongs to an earlier payment environment. Please contact CCAK before paying.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claimed, error: claimError } = await supabaseAdmin.from("shop_orders").update({ status: "pending", phone }).eq("id", order.id).eq("status", "ready").select("id").maybeSingle();
    if (claimError || !claimed) throw new Error("A payment request is already in progress.");
    try {
      const origin = process.env["PUBLIC_APP_URL"] || "https://codebase-migration-studio.lovable.app";
      const stk = await initiateStkPush({ amount: order.amount_kes, phone, accountReference: `SHOP${order.id.replace(/-/g, "").slice(0, 8)}`, transactionDesc: "CCAK shop", callbackUrl: `${origin.replace(/\/+$/, "")}/api/public/shop/mpesa/callback` });
      const { error: attachError } = await supabaseAdmin.from("shop_orders").update({ checkout_request_id: stk.checkoutRequestId, merchant_request_id: stk.merchantRequestId }).eq("id", order.id);
      if (attachError) throw new Error("Payment tracking failed. Contact CCAK before trying again.");
      return { message: environment === "production" ? "Safaricom accepted your payment request. Enter your M-Pesa PIN on your phone to pay the order total." : "Test payment request accepted by Safaricom. No real money is charged." };
    } catch {
      await supabaseAdmin.from("shop_orders").update({ status: "failed" }).eq("id", order.id).eq("status", "pending");
      throw new Error("Safaricom could not complete the payment request. Contact CCAK before trying again.");
    }
  });

export const getShopQuoteRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: permitted, error: roleError } = await context.supabase.rpc("is_national_admin");
    if (roleError || !permitted) throw new Error("National administrator access required.");
    const members = await context.supabase.from("shop_orders").select("*").eq("status", "awaiting_quote").order("created_at");
    const guests = await context.supabase.from("guest_shop_orders").select("*").eq("status", "awaiting_quote").order("created_at");
    if (members.error || guests.error) throw new Error("Could not load delivery quote requests.");
    return [
      ...members.data.map((order) => ({ ...order, kind: "member" as const })),
      ...guests.data.map(({ guest_session_hash: _hash, request_key: _key, ...order }) => ({ ...order, kind: "guest" as const })),
    ];
  });

export const saveShopQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ order_id: z.string().uuid(), kind: z.enum(["member", "guest"]).default("member"), fee_kes: z.number().int().min(0).max(1000000), quote_reference: z.string().trim().min(3).max(200) }).parse(data))
  .handler(async ({ data, context }) => {
    const { kind, ...quote } = data;
    const { error } = await context.supabase.rpc(kind === "guest" ? "quote_guest_shop_delivery" : "quote_shop_delivery", quote);
    if (error) throw new Error("Delivery quote was not saved. Check permissions and order status.");
    return { saved: true };
  });

export const saveStandardShipping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => standardShippingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const fee = standardParcelFee(data.weight_kg);
    const { error } = await context.supabase.rpc(data.kind === "guest" ? "quote_guest_shop_delivery" : "quote_shop_delivery", {
      order_id: data.order_id, fee_kes: fee,
      quote_reference: `CCAK standard parcel fee; packed weight ${data.weight_kg} kg`,
    });
    if (error) throw new Error("Delivery fee was not saved. Check administrator access and order status.");
    return { saved: true, fee_kes: fee };
  });