import { z } from "zod";

export const STANDARD_PARCEL_FEE_KES = 350;
export const STANDARD_PARCEL_LIMIT_KG = 5;
export const OTHER_COUNTY_FEE_KES = 500;
export const HEAVY_PARCEL_FEE_KES = 1000;

/** Owner-confirmed packed unit weights only. Null means configuration is still required. */
export const PACKED_PRODUCT_WEIGHTS_KG: Record<string, number | null> = {
  "nyeri-aa": null,
  "kirinyaga-pb": null,
  "ccak-tote": null,
};

export function isKenya(country: string): boolean {
  return ["kenya", "ke", "ken"].includes(country.trim().toLowerCase());
}

/** CCAK delivery prices, not a courier tariff. Exactly 5 kg uses the heavy tier. */
export function kenyaDeliveryFee(weightKg: unknown, county: string): number {
  const weight = z.number().finite().positive().parse(weightKg);
  const destination = z.string().trim().min(2).parse(county).toLowerCase();
  if (weight >= STANDARD_PARCEL_LIMIT_KG) return HEAVY_PARCEL_FEE_KES;
  return ["nairobi", "kiambu"].includes(destination) ? STANDARD_PARCEL_FEE_KES : OTHER_COUNTY_FEE_KES;
}

export interface DeliveryCartItem { id: string; quantity: number; physical: boolean }
export interface DeliveryAddress { country: string; county?: string | undefined }

export function automaticDelivery(
  items: DeliveryCartItem[],
  address?: DeliveryAddress,
  weights: Readonly<Record<string, number | null>> = PACKED_PRODUCT_WEIGHTS_KG,
) {
  const physical = items.filter((item) => item.physical);
  if (!physical.length) return { fee: 0, weightKg: 0, reference: null, reason: null };
  if (!address) throw new Error("Delivery address is required.");
  if (!isKenya(address.country)) return { fee: null, weightKg: null, reference: null, reason: "international_quote" };
  if (!address.county?.trim()) throw new Error("Select your delivery county.");
  let grams = 0;
  for (const item of physical) {
    const unitWeight = weights[item.id];
    if (unitWeight === null || unitWeight === undefined) return { fee: null, weightKg: null, reference: null, reason: "missing_weight" };
    z.number().finite().positive().parse(unitWeight);
    grams += Math.round(unitWeight * 1000) * item.quantity;
  }
  const weightKg = grams / 1000;
  const fee = kenyaDeliveryFee(weightKg, address.county);
  return { fee, weightKg, reference: `CCAK automatic delivery: ${address.county}; ${weightKg} kg`, reason: null };
}

/** Actual packed parcel weight, confirmed by national staff, not shopper input. */
export function standardParcelFee(weightKg: unknown, county: string): number {
  return kenyaDeliveryFee(weightKg, county);
}

export const standardShippingSchema = z.object({
  order_id: z.string().uuid(),
  kind: z.enum(["member", "guest"]),
  weight_kg: z.number().finite().positive(),
  county: z.string().trim().min(2).max(80),
});