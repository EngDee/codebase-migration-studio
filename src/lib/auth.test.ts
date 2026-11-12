import { describe, expect, it } from "vitest";
import { accountSchema, confirmationUrl, isPasswordRecovery } from "./auth";

describe("member account access", () => {
  it("confirms email on a public page rather than a protected membership page", () => {
    expect(confirmationUrl("https://codebase-migration-studio.lovable.app")).toBe("https://codebase-migration-studio.lovable.app/auth");
  });
  it("requires a real email and an eight-character password", () => {
    expect(accountSchema.safeParse({ email: "member", password: "12345678" }).success).toBe(false);
    expect(accountSchema.safeParse({ email: "member@example.com", password: "1234567" }).success).toBe(false);
    expect(accountSchema.parse({ email: " member@example.com ", password: "12345678" }).email).toBe("member@example.com");
  });
  it("distinguishes password recovery from ordinary account confirmation", () => {
    expect(isPasswordRecovery("#access_token=example&type=recovery")).toBe(true);
    expect(isPasswordRecovery("#type=signup")).toBe(false);
  });
});