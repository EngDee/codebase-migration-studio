import { describe, expect, it } from "vitest";
import { newsletterSchema, publicInquirySchema } from "./public-form-schemas";

describe("Public submission validation", () => {
  it("accepts valid newsletter addresses and rejects invalid addresses", () => {
    expect(newsletterSchema.safeParse({ email: "member@example.com" }).success).toBe(true);
    expect(newsletterSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
  it("accepts partner and donate inquiries only", () => {
    const fields = { full_name: "Member", email: "member@example.com" };
    expect(publicInquirySchema.safeParse({ ...fields, kind: "partner" }).success).toBe(true);
    expect(publicInquirySchema.safeParse({ ...fields, kind: "donate" }).success).toBe(true);
    expect(publicInquirySchema.safeParse({ ...fields, kind: "admin" }).success).toBe(false);
  });
  it("rejects blank names, oversized messages and honeypot submissions", () => {
    const fields = { kind: "partner", full_name: "Member", email: "member@example.com" };
    expect(publicInquirySchema.safeParse({ ...fields, full_name: " " }).success).toBe(false);
    expect(publicInquirySchema.safeParse({ ...fields, message: "x".repeat(1001) }).success).toBe(false);
    expect(publicInquirySchema.safeParse({ ...fields, company_website: "spam" }).success).toBe(false);
  });
});