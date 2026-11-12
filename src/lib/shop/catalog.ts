import { z } from "zod";

export const PRODUCTS = [
  { id: "nyeri-aa", tag: "Nyeri AA", name: "Nyeri AA whole bean, 250g", price: 950, physical: true },
  { id: "kirinyaga-pb", tag: "Kirinyaga PB", name: "Kirinyaga peaberry, ground, 250g", price: 1050, physical: true },
  { id: "ccak-tote", tag: "Merchandise", name: "CCAK founding-member tote", price: 650, physical: true },
  { id: "export-course", tag: "Academy", name: "Export readiness course access", price: 2500, physical: false },
] as const;

export const cartSchema = z.array(z.object({ id: z.enum(["nyeri-aa", "kirinyaga-pb", "ccak-tote", "export-course"]), quantity: z.number().int().min(1).max(20) })).min(1).max(4)
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length, "Duplicate cart items");
export type CartItem = z.infer<typeof cartSchema>[number];
export const addressSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9).max(20),
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(300),
  postal_code: z.string().trim().max(30),
});
export const checkoutSchema = z.object({ items: cartSchema, shipping: addressSchema.optional(), request_key: z.string().uuid() });

export function priceCart(input: unknown) {
  const items = cartSchema.parse(input).map((item) => {
    const product = PRODUCTS.find((p) => p.id === item.id);
    if (!product) throw new Error("Product unavailable.");
    return { ...item, name: product.name, unit_price_kes: product.price, physical: product.physical };
  });
  return { items, subtotal: items.reduce((sum, item) => sum + item.unit_price_kes * item.quantity, 0), needsShipping: items.some((item) => item.physical) };
}

export function requireShopPaymentMode(mode: string | undefined): "production" | "sandbox" {
  if (mode !== "production" && mode !== "sandbox") throw new Error("M-Pesa is awaiting activation. Please contact CCAK before paying.");
  return mode;
}
export const kes = (amount: number) => `KES ${amount.toLocaleString("en-KE")}`;