import { describe, expect, it } from "vitest";
import { canReconcileContribution, contributionDocumentTotals, isLiveContribution, type ContributionDocument } from "./contribution-documents";

const payment: ContributionDocument = { id: "75bb44fa-3d40-470d-8cee-e09436320aa1", amount_kes: 500, status: "paid", payment_environment: "production", mpesa_receipt: "UKL7E2US1Z", paid_at: "2026-11-21T16:27:00Z", created_at: "2026-11-21T13:56:16Z", result_desc: null };
describe("membership payment documents", () => {
  it("receipts use the actual KES 500 recorded payment with zero remaining balance", () => {
    expect(contributionDocumentTotals(payment)).toEqual({ total: 500, received: 500, balance: 0 });
    expect(contributionDocumentTotals({ ...payment, amount_kes: 750 }).total).toBe(750);
  });
  it("does not issue paid receipts or unlock cards for test or unknown historical environments", () => {
    expect(isLiveContribution(payment)).toBe(true);
    expect(isLiveContribution({ ...payment, payment_environment: "sandbox" })).toBe(false);
    expect(isLiveContribution({ ...payment, payment_environment: "legacy_unverified" })).toBe(false);
    expect(isLiveContribution({ ...payment, status: "pending" })).toBe(false);
  });
  it("shows an unpaid KES 500 balance until live payment is confirmed", () => {
    expect(contributionDocumentTotals({ ...payment, status: "pending" })).toEqual({ total: 500, received: 0, balance: 500 });
  });
  it("queries pending payments only in their recorded environment", () => {
    const pending = { status: "pending", payment_environment: "production", checkout_request_id: "checkout" };
    expect(canReconcileContribution(pending, "production")).toBe(true);
    expect(canReconcileContribution(pending, "sandbox")).toBe(false);
    expect(canReconcileContribution({ ...pending, payment_environment: "legacy_unverified" }, "production")).toBe(false);
    expect(canReconcileContribution({ ...pending, status: "paid" }, "production")).toBe(false);
    expect(canReconcileContribution({ ...pending, checkout_request_id: null }, "production")).toBe(false);
  });
});