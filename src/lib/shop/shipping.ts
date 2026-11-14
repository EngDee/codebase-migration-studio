import { z } from "zod";

export const STANDARD_PARCEL_FEE_KES = 350;
export const STANDARD_PARCEL_LIMIT_KG = 5;

/** Actual packed parcel weight, confirmed by national staff, not shopper input. */
export function standardParcelFee(weightKg: unknown): number {
  const weight = z.number().finite().positive().lt(STANDARD_PARCEL_LIMIT_KG,
    "The standard fee applies only to parcels below 5 kg. Use a confirmed quote for heavier parcels.").parse(weightKg);
  return weight > 0 ? STANDARD_PARCEL_FEE_KES : STANDARD_PARCEL_FEE_KES;
}

export const standardShippingSchema = z.object({
  order_id: z.string().uuid(),
  kind: z.enum(["member", "guest"]),
  weight_kg: z.number().finite().positive().lt(STANDARD_PARCEL_LIMIT_KG),
});