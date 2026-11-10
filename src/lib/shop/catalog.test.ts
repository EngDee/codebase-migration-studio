import { describe, expect, it } from "vitest";
import { priceCart, requireShopTestMode } from "./catalog";

describe("approved shop pricing", () => {
  it("prices Nyeri AA at KES 950", () => { expect(priceCart([{ id: "nyeri-aa", quantity: 1 }]).subtotal).toBe(950); });
  it("prices Kirinyaga peaberry at KES 1050", () => { expect(priceCart([{ id: "kirinyaga-pb", quantity: 1 }]).subtotal).toBe(1050); });
  it("prices totes at KES 650", () => { expect(priceCart([{ id: "ccak-tote", quantity: 1 }]).subtotal).toBe(650); });
  it("prices course access at KES 2500 without shipping", () => { const cart = priceCart([{ id: "export-course", quantity: 1 }]); expect(cart.subtotal).toBe(2500); expect(cart.needsShipping).toBe(false); });
  it("calculates quantities using server prices and requires courier quote for goods", () => { const cart = priceCart([{ id: "nyeri-aa", quantity: 2, price: 1 }, { id: "ccak-tote", quantity: 1 }]); expect(cart.subtotal).toBe(2550); expect(cart.needsShipping).toBe(true); });
  it("rejects unknown products and duplicate lines", () => { expect(() => priceCart([{ id: "fake", quantity: 1 }])).toThrow(); expect(() => priceCart([{ id: "nyeri-aa", quantity: 1 }, { id: "nyeri-aa", quantity: 1 }])).toThrow(); });
  it("blocks real payments and allows only test mode", () => { expect(() => requireShopTestMode("production")).toThrow(); expect(() => requireShopTestMode("invalid")).toThrow(); expect(() => requireShopTestMode("sandbox")).not.toThrow(); expect(() => requireShopTestMode(undefined)).not.toThrow(); });
});