import { describe, expect, it, vi } from "vitest";
import { canRunSandboxCheck, checkDarajaSandbox } from "./sandbox-check";

const config = { DARAJA_ENV: "sandbox", DARAJA_CONSUMER_KEY: "test-key", DARAJA_CONSUMER_SECRET: "test-secret", DARAJA_SHORTCODE: "174379", DARAJA_PASSKEY: "test-passkey" };

describe("no-charge Daraja sandbox diagnostic", () => {
  it("blocks production before any network request", async () => {
    const request = vi.fn();
    expect((await checkDarajaSandbox({ ...config, DARAJA_ENV: "production" }, request)).ok).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
  it("blocks unknown environments before any network request", async () => {
    const request = vi.fn();
    expect((await checkDarajaSandbox({ ...config, DARAJA_ENV: "invalid" }, request)).ok).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
  it("requires all four saved credentials", async () => {
    for (const name of ["DARAJA_CONSUMER_KEY", "DARAJA_CONSUMER_SECRET", "DARAJA_SHORTCODE", "DARAJA_PASSKEY"]) {
      const request = vi.fn();
      expect((await checkDarajaSandbox({ ...config, [name]: undefined }, request)).ok).toBe(false);
      expect(request).not.toHaveBeenCalled();
    }
  });
  it("only makes a read-only sandbox authentication request, never a payment request", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ access_token: "test-token" }));
    const result = await checkDarajaSandbox(config, request);
    expect(result.ok).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials");
    expect(request.mock.calls[0]?.[1].method).toBe("GET");
    expect(request.mock.calls[0]?.[1].redirect).toBe("manual");
    expect(JSON.stringify(result)).not.toContain("test-token");
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });
  it("handles rejected credentials without returning provider contents", async () => {
    const request = vi.fn().mockResolvedValue(new Response("sensitive-provider-body", { status: 401 }));
    const result = await checkDarajaSandbox(config, request);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("sensitive-provider-body");
  });
  it("reports invalid provider responses as failure", async () => {
    expect((await checkDarajaSandbox(config, vi.fn().mockResolvedValue(Response.json({})))).ok).toBe(false);
  });
  it("reports connection failures without leaking error details", async () => {
    const result = await checkDarajaSandbox(config, vi.fn().mockRejectedValue(new Error("sensitive-error")));
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("sensitive-error");
  });
  it("allows only national administrators, including legacy admin", () => {
    expect(canRunSandboxCheck(["admin"])).toBe(true);
    expect(canRunSandboxCheck(["super_admin"])).toBe(true);
    expect(canRunSandboxCheck(["national_admin"])).toBe(true);
    expect(canRunSandboxCheck(["county_admin"])).toBe(false);
    expect(canRunSandboxCheck(["member"])).toBe(false);
    expect(canRunSandboxCheck([])).toBe(false);
  });
});