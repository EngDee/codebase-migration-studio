import { describe, expect, it, vi } from "vitest";
import { checkDarajaProduction } from "./production-check";

const good = { DARAJA_ENV: "production", DARAJA_TRANSACTION_TYPE: "CustomerBuyGoodsOnline", DARAJA_CONSUMER_KEY: "k", DARAJA_CONSUMER_SECRET: "s", DARAJA_SHORTCODE: "5123456", DARAJA_PASSKEY: "p", DARAJA_PARTY_B: "987654" };
const okFetch = () => vi.fn(async () => new Response(JSON.stringify({ access_token: "t" }), { status: 200 })) as unknown as typeof fetch;

describe("production readiness", () => {
  it("passes a complete Till setup and only calls live OAuth", async () => {
    const f = okFetch();
    const r = await checkDarajaProduction(good, f);
    expect(r.ready).toBe(true);
    expect(vi.mocked(f).mock.calls[0]?.[0]).toBe("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials");
  });
  it("blocks sandbox mode without contacting Safaricom", async () => {
    const f = okFetch();
    expect((await checkDarajaProduction({ ...good, DARAJA_ENV: "sandbox" }, f)).ready).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("rejects the sandbox shortcode 174379", async () => {
    expect((await checkDarajaProduction({ ...good, DARAJA_SHORTCODE: "174379" }, okFetch())).ready).toBe(false);
  });
  it("requires a transaction type", async () => {
    expect((await checkDarajaProduction({ ...good, DARAJA_TRANSACTION_TYPE: undefined }, okFetch())).ready).toBe(false);
  });
  it("fails when Safaricom rejects the keys", async () => {
    const f = vi.fn(async () => new Response("", { status: 401 })) as unknown as typeof fetch;
    expect((await checkDarajaProduction(good, f)).ready).toBe(false);
  });
});
