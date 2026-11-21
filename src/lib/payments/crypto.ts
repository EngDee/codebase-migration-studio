/** CCAK direct treasury wallets. Monero (XMR) stays hidden until its address is supplied. */
export const CRYPTO_ASSETS = [
  { id: "USDT_TRC20", symbol: "USDT", name: "Tether USDT", network: "TRON (TRC-20)", coingecko: "tether", wallet: "TN4iogXCAmnj7GTvk7ik4qVNomNxKndgYB", explorerBase: "https://tronscan.org/#/transaction/" },
  { id: "BTC", symbol: "BTC", name: "Bitcoin", network: "Bitcoin network", coingecko: "bitcoin", wallet: "16KqnZS5MFhXjz88o4d4beqJuL86j3rHi5", explorerBase: "https://mempool.space/tx/" },
  { id: "ETH", symbol: "ETH", name: "Ethereum", network: "Ethereum / EVM networks", coingecko: "ethereum", wallet: "0x7ad2be8a93fe3aa17cd7a83b9cacb252328e0ece", explorerBase: "https://etherscan.io/tx/" },
  { id: "SOL", symbol: "SOL", name: "Solana", network: "Solana", coingecko: "solana", wallet: "ExNTk5YugKW4vtfts3MxBzfWDigTjJJUpBgmAufW6i1H", explorerBase: "https://solscan.io/tx/" },
  { id: "WLD", symbol: "WLD", name: "Worldcoin", network: "World Chain / OP Mainnet", coingecko: "worldcoin-wld", wallet: "0x7ad2be8a93fe3aa17cd7a83b9cacb252328e0ece", explorerBase: "https://worldscan.org/tx/" },
  { id: "TRX", symbol: "TRX", name: "TRON", network: "TRON mainnet", coingecko: "tron", wallet: "TN4iogXCAmnj7GTvk7ik4qVNomNxKndgYB", explorerBase: "https://tronscan.org/#/transaction/" },
  { id: "DOGE", symbol: "DOGE", name: "Dogecoin", network: "Dogecoin network", coingecko: "dogecoin", wallet: "DRcaswaoajD5JK9nhtsjTLSqfFZDHC3vv3", explorerBase: "https://dogechain.info/tx/" },
] as const;
export type CryptoAssetId = (typeof CRYPTO_ASSETS)[number]["id"];
export type CryptoPurpose = "donation" | "shop_order" | "membership" | "academy";

export function cryptoAsset(id: string) {
  return CRYPTO_ASSETS.find((a) => a.id === id) ?? null;
}
/** Approximate coin amount for a KES total at a live KES price; null when no rate is available. */
export function kesToCrypto(amountKes: number, kesPerCoin: number | null | undefined): string | null {
  if (!kesPerCoin || kesPerCoin <= 0 || !(amountKes > 0)) return null;
  const v = amountKes / kesPerCoin;
  return v >= 1 ? v.toFixed(4) : v.toPrecision(4);
}
export function isPlausibleTxid(txid: string) {
  return /^(0x)?[A-Za-z0-9]{40,120}$/.test(txid.trim());
}
