import { describe, expect, it } from "vitest";
import { automaticDelivery, kenyaDeliveryFee, standardParcelFee, standardShippingSchema } from "./shipping";

describe("CCAK standard parcel shipping", () => {
  it("charges KES 350 below 5 kg in Nairobi", () => {
    expect(kenyaDeliveryFee(4.999, "Nairobi")).toBe(350);
  });
  it("charges KES 350 below 5 kg in Kiambu", () => {
    expect(kenyaDeliveryFee(4.999, "Kiambu")).toBe(350);
  });
  it("charges KES 500 below 5 kg in other counties", () => {
    expect(kenyaDeliveryFee(4.999, "Mombasa")).toBe(500);
    expect(kenyaDeliveryFee(0.5, "Nyeri")).toBe(500);
  });
  it("charges KES 1000 above 5 kg nationwide", () => {
    for (const county of ["Nairobi", "Kiambu", "Mombasa", "Nyeri"]) expect(kenyaDeliveryFee(5.001, county)).toBe(1000);
  });
  it("uses the higher tier at the unspecified exact 5 kg boundary", () => {
    expect(kenyaDeliveryFee(5, "Nairobi")).toBe(1000);
  });
  it("rejects unknown, invalid or shopper-string weights", () => {
    for (const weight of [undefined, null, 0, -1, NaN, Infinity, "1"]) {
      expect(() => standardParcelFee(weight, "Nairobi")).toThrow();
    }
  });
  it("supports all weight tiers for legacy guest and member orders", () => {
    for (const kind of ["member", "guest"]) {
      const input = { order_id: "8a28a497-831f-4d78-a329-7c87fbe45051", kind, weight_kg: 4.99, county: "Kiambu" };
      expect(standardShippingSchema.parse(input).weight_kg).toBe(4.99);
      expect(standardShippingSchema.parse({ ...input, weight_kg: 5 }).weight_kg).toBe(5);
    }
  });
  it("computes quantities from trusted unit weights and excludes digital products", () => {
    const delivery = automaticDelivery([{ id: "nyeri-aa", quantity: 20, physical: true }, { id: "export-course", quantity: 1, physical: false }], { country: "Kenya", county: "Kiambu" }, { "nyeri-aa": 0.3 });
    expect(delivery.weightKg).toBe(6);
    expect(delivery.fee).toBe(1000);
  });
  it("does not invent unconfigured product weights", () => {
    expect(automaticDelivery([{ id: "ccak-tote", quantity: 1, physical: true }], { country: "Kenya", county: "Nairobi" }, {}).reason).toBe("missing_weight");
  });
  it("keeps international orders outside the Kenyan fee rules", () => {
    expect(automaticDelivery([{ id: "nyeri-aa", quantity: 1, physical: true }], { country: "Uganda" }, { "nyeri-aa": 0.3 }).fee).toBeNull();
  });
  it("charges no delivery for digital courses", () => {
    expect(automaticDelivery([{ id: "export-course", quantity: 1, physical: false }]).fee).toBe(0);
  });
  it("calculates mixed cart weight from the confirmed coffee and tote weights", () => {
    const result = automaticDelivery([
      { id: "nyeri-aa", quantity: 2, physical: true },
      { id: "kirinyaga-pb", quantity: 1, physical: true },
      { id: "ccak-tote", quantity: 3, physical: true },
    ], { country: "Kenya", county: "Kiambu" });
    expect(result.weightKg).toBe(1.05);
    expect(result.fee).toBe(350);
  });
  it("moves a coffee order into the heavy tier when a tote takes it above 5 kg", () => {
    expect(automaticDelivery([
      { id: "nyeri-aa", quantity: 20, physical: true },
      { id: "ccak-tote", quantity: 1, physical: true },
    ], { country: "Kenya", county: "Nairobi" })).toMatchObject({ weightKg: 5.1, fee: 1000 });
  });
});