import { describe, expect, it } from "vitest";
import { canDownloadMaterial, deliveryLabel } from "./order-rules";
const items = [{ id: "export-course", name: "Course", quantity: 1, unit_price_kes: 2500, physical: false }];
describe("purchased materials and delivery", () => {
  it("unlocks purchased study materials only after live confirmed payment", () => { expect(canDownloadMaterial({ items, status: "paid", payment_environment: "production" }, "export-course")).toBe(true); });
  it("does not unlock paid sandbox materials", () => { expect(canDownloadMaterial({ items, status: "paid", payment_environment: "sandbox" }, "export-course")).toBe(false); });
  it("blocks unpaid and unpurchased material downloads", () => { expect(canDownloadMaterial({ items, status: "pending", payment_environment: "production" }, "export-course")).toBe(false); expect(canDownloadMaterial({ items, status: "paid", payment_environment: "production" }, "other")).toBe(false); });
  it("digital study materials require no shipping", () => { expect(deliveryLabel({ items, payment_environment: "production", delivery_status: "not_dispatched" })).toBe("Digital order · No shipping"); });
  it("test goods are never shown as dispatched", () => { expect(deliveryLabel({ items: [{ ...items[0], physical: true }], payment_environment: "sandbox", delivery_status: "dispatched" })).toBe("Test order · Not dispatched"); });
});