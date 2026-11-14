import { describe, expect, it } from "vitest";
import { standardParcelFee, standardShippingSchema } from "./shipping";

describe("CCAK standard parcel shipping", () => {
  it("charges exactly KES 350 for a parcel below 5 kg", () => {
    expect(standardParcelFee(0.5)).toBe(350);
    expect(standardParcelFee(4.999)).toBe(350);
  });
  it("does not apply the standard fee at exactly 5 kg or above", () => {
    expect(() => standardParcelFee(5)).toThrow();
    expect(() => standardParcelFee(5.001)).toThrow();
  });
  it("rejects unknown, invalid or shopper-string weights", () => {
    for (const weight of [undefined, null, 0, -1, NaN, Infinity, "1"]) {
      expect(() => standardParcelFee(weight)).toThrow();
    }
  });
  it("validates the same strict limit for both guest and member approval", () => {
    for (const kind of ["member", "guest"]) {
      const input = { order_id: "8a28a497-831f-4d78-a329-7c87fbe45051", kind, weight_kg: 4.99 };
      expect(standardShippingSchema.parse(input).weight_kg).toBe(4.99);
      expect(() => standardShippingSchema.parse({ ...input, weight_kg: 5 })).toThrow();
    }
  });
});