import { describe, expect, it } from "vitest";
import { CRYPTO_ASSETS, cryptoAsset, isPlausibleTxid, kesToCrypto } from "./crypto";

describe("crypto treasury", () => {
  it("offers the 7 coins with addresses and hides Monero until supplied", () => {
    expect(CRYPTO_ASSETS.map((a) => a.id)).toEqual(["USDT_TRC20", "BTC", "ETH", "SOL", "WLD", "TRX", "DOGE"]);
    expect(cryptoAsset("XMR")).toBeNull();
  });
  it("uses the official CCAK wallets", () => {
    expect(cryptoAsset("BTC")?.wallet).toBe("16KqnZS5MFhXjz88o4d4beqJuL86j3rHi5");
    expect(cryptoAsset("USDT_TRC20")?.wallet).toBe("TN4iogXCAmnj7GTvk7ik4qVNomNxKndgYB");
    expect(cryptoAsset("WLD")?.wallet).toBe("0x7ad2be8a93fe3aa17cd7a83b9cacb252328e0ece");
    expect(cryptoAsset("SOL")?.wallet).toBe("ExNTk5YugKW4vtfts3MxBzfWDigTjJJUpBgmAufW6i1H");
    expect(cryptoAsset("DOGE")?.wallet).toBe("DRcaswaoajD5JK9nhtsjTLSqfFZDHC3vv3");
  });
  it("shows no amount when there is no live rate, never a guessed one", () => {
    expect(kesToCrypto(1000, null)).toBeNull();
    expect(kesToCrypto(1300, 130)).toBe("10.0000");
  });
  it("rejects short or malformed transaction IDs", () => {
    expect(isPlausibleTxid("abc")).toBe(false);
    expect(isPlausibleTxid("0x" + "a".repeat(64))).toBe(true);
  });
});
