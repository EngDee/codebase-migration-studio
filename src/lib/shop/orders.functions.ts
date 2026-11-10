import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canDownloadMaterial, orderItems } from "./order-rules";

export const getCustomerOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: order, error } = await context.supabase.from("shop_orders").select("*").eq("id", data.order_id).eq("user_id", context.userId).maybeSingle();
    if (error || !order) throw new Error("Order not available for this account.");
    const ids = orderItems(order.items).filter((item) => !item.physical).map((item) => item.id);
    const { data: materials, error: materialsError } = await context.supabase.from("shop_materials").select("id,product_id,title,filename").in("product_id", ids);
    if (materialsError) throw new Error("Study materials could not be loaded.");
    const { data: profile, error: profileError } = await context.supabase.from("profiles").select("full_name").eq("id", context.userId).single();
    if (profileError) throw new Error("Customer details could not be loaded.");
    return { order, materials: materials ?? [], customerName: profile.full_name, presidentName: process.env["CCAK_PRESIDENT_NAME"] || "David Muigai Miringu" };
  });

export const prepareMaterialDownload = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid(), material_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: order, error } = await context.supabase.from("shop_orders").select("*").eq("id", data.order_id).eq("user_id", context.userId).maybeSingle();
    if (error || !order) throw new Error("Order not available.");
    const { data: material, error: materialError } = await context.supabase.from("shop_materials").select("*").eq("id", data.material_id).maybeSingle();
    if (materialError || !material || !canDownloadMaterial(order, material.product_id)) throw new Error("A confirmed live purchase is required. Test payments do not unlock materials.");
    const { data: signed, error: signError } = await context.supabase.storage.from("shop-materials").createSignedUrl(material.storage_path, 60, { download: material.filename });
    if (signError || !signed) throw new Error("The study file is unavailable. Contact CCAK.");
    return { url: signed.signedUrl, filename: material.filename };
  });

export const getShopFulfilment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  const { data: permitted, error } = await context.supabase.rpc("is_national_admin");
  if (error || !permitted) throw new Error("National administrator access required.");
  const orders = await context.supabase.from("shop_orders").select("*").eq("status", "paid").eq("payment_environment", "production").order("created_at", { ascending: false }).limit(100);
  const materials = await context.supabase.from("shop_materials").select("id,title,filename").order("created_at", { ascending: false });
  if (orders.error || materials.error) throw new Error("Could not load fulfilment.");
  return { orders: orders.data, materials: materials.data };
});
export const publishShopMaterial = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ material_product: z.literal("export-course"), material_title: z.string().trim().min(2).max(160), material_path: z.string().min(1).max(300), material_filename: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("publish_shop_material", data);
    if (error) throw new Error("Study material could not be published. Confirm your permissions and uploaded file.");
    return { saved: true };
  });
export const updateShopDelivery = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid(), new_status: z.enum(["preparing", "dispatched", "delivered"]), tracking: z.string().trim().max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_shop_delivery", data);
    if (error) throw new Error("Delivery update was not saved. A live paid order and valid tracking details are required.");
    return { saved: true };
  });