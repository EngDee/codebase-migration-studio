import { describe, expect, it } from "vitest";
import { priceCart, requireShopPaymentMode } from "./catalog";

describe("approved shop pricing", () => {
  it("prices Nyeri AA at KES 950", () => { expect(priceCart([{ id: "nyeri-aa", quantity: 1 }]).subtotal).toBe(950); });
  it("prices Kirinyaga peaberry at KES 1050", () => { expect(priceCart([{ id: "kirinyaga-pb", quantity: 1 }]).subtotal).toBe(1050); });
  it("prices totes at KES 650", () => { expect(priceCart([{ id: "ccak-tote", quantity: 1 }]).subtotal).toBe(650); });
  it("prices course access at KES 2500 without shipping", () => { const cart = priceCart([{ id: "export-course", quantity: 1 }]); expect(cart.subtotal).toBe(2500); expect(cart.needsShipping).toBe(false); });
  it("calculates quantities using server prices and requires courier quote for goods", () => { const cart = priceCart([{ id: "nyeri-aa", quantity: 2, price: 1 }, { id: "ccak-tote", quantity: 1 }]); expect(cart.subtotal).toBe(2550); expect(cart.needsShipping).toBe(true); });
  it("rejects unknown products and duplicate lines", () => { expect(() => priceCart([{ id: "fake", quantity: 1 }])).toThrow(); expect(() => priceCart([{ id: "nyeri-aa", quantity: 1 }, { id: "nyeri-aa", quantity: 1 }])).toThrow(); });
  it("permits explicitly configured live M-Pesa payments", () => { expect(requireShopPaymentMode("production")).toBe("production"); });
  it("never silently defaults an unconfigured payment to sandbox", () => { expect(() => requireShopPaymentMode(undefined)).toThrow(); expect(() => requireShopPaymentMode("invalid")).toThrow(); });
  it("keeps explicitly configured historical sandbox testing separate", () => { expect(requireShopPaymentMode("sandbox")).toBe("sandbox"); });
});