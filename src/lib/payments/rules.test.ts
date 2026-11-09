import { describe, expect, it } from "vitest";
import { normaliseMpesaPhone, cardEligible, callbackMatchesPayment } from "./rules";
import { parseStkCallback } from "./daraja";
import { verifyMemberIdentity } from "../identity/verify";

describe("contributions and membership cards", () => {
  it("normalises valid Kenyan mobile numbers without truncating invalid numbers", () => {
    expect(normaliseMpesaPhone("0703424972")).toBe("254703424972");
    expect(normaliseMpesaPhone("+254 703 424 972")).toBe("254703424972");
    expect(() => normaliseMpesaPhone("2547034249729")).toThrow();
    expect(() => normaliseMpesaPhone("0203424972")).toThrow();
  });
  it("requires approval, an issued member number and confirmed payment", () => {
    expect(cardEligible("approved", "CCAK/KIA/26/001", true)).toBe(true);
    expect(cardEligible("pending", "CCAK/KIA/26/001", true)).toBe(false);
    expect(cardEligible("approved", null, true)).toBe(false);
    expect(cardEligible("approved", "CCAK/KIA/26/001", false)).toBe(false);
  });
  it("rejects mismatched payment amount, phone and request identifiers", () => {
    const payment = { checkout_request_id: "checkout-1", merchant_request_id: "merchant-1", amount_kes: 500, phone: "254703424972" };
    const callback = { checkoutRequestId: "checkout-1", merchantRequestId: "merchant-1", amount: 500, phone: "254703424972" };
    expect(callbackMatchesPayment(callback, payment)).toBe(true);
    expect(callbackMatchesPayment({ ...callback, amount: 1 }, payment)).toBe(false);
    expect(callbackMatchesPayment({ ...callback, phone: "254711111111" }, payment)).toBe(false);
    expect(callbackMatchesPayment({ ...callback, checkoutRequestId: "other" }, payment)).toBe(false);
  });
  it("rejects malformed callbacks", () => {
    expect(() => parseStkCallback({ Body: { stkCallback: { ResultCode: 0 } } })).toThrow();
  });
  it("matches the National ID and phone already recorded on the member", async () => {
    const stored = { national_id: "12345678", phone: "0703424972" };
    expect((await verifyMemberIdentity({ nationalId: "12345678", phone: "+254703424972" }, stored)).matched).toBe(true);
    expect((await verifyMemberIdentity({ nationalId: "12345679", phone: "0703424972" }, stored)).matched).toBe(false);
  });
});