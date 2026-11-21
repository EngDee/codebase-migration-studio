import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CRYPTO_ASSETS, isPlausibleTxid, kesToCrypto, type CryptoAssetId, type CryptoPurpose } from "@/lib/payments/crypto";

export interface CryptoPaymentProps {
  amountKes: number;
  purpose: CryptoPurpose;
  /** Order number, membership number or course reference shown to admins. */
  reference?: string;
  className?: string;
}

/** Pay directly into a CCAK treasury wallet, then submit the transaction ID for admin verification. */
export function CryptoPayment({ amountKes, purpose, reference, className = "" }: CryptoPaymentProps) {
  const [assetId, setAssetId] = useState<CryptoAssetId>("USDT_TRC20");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const asset = CRYPTO_ASSETS.find((a) => a.id === assetId) ?? CRYPTO_ASSETS[0];

  useEffect(() => {
    const ids = CRYPTO_ASSETS.map((a) => a.coingecko).join(",");
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=kes`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, { kes?: number }>) => setRates(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.kes ?? 0]))))
      .catch(() => setRates({}));
  }, []);

  const approx = kesToCrypto(amountKes, rates[asset.coingecko]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(asset.wallet); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const txid = String(fd.get("txid") ?? "").trim();
    if (!isPlausibleTxid(txid)) { setMsg({ ok: false, text: "Enter the full transaction ID (hash) shown in your wallet." }); return; }
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.rpc("submit_crypto_payment", { payload: {
        asset_id: asset.id, txid, purpose, reference: reference ?? null, amount_kes: Math.round(amountKes),
        amount_crypto_approx: approx ? `${approx} ${asset.symbol}` : null,
        payer_name: String(fd.get("payer_name") ?? ""), payer_contact: String(fd.get("payer_contact") ?? ""),
      } });
      if (error) throw error;
      e.currentTarget?.reset();
      setMsg({ ok: true, text: "Thank you! Your transaction was received. CCAK will confirm it on the blockchain before marking it paid." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error && err.message ? err.message : "Could not submit. Check your connection and try again." });
    } finally { setBusy(false); }
  };

  return (
    <section className={`crypto-pay ${className}`} aria-labelledby="crypto-pay-title">
      <h3 id="crypto-pay-title">Or pay with crypto</h3>
      <p className="section-note">Sent directly to the CCAK treasury wallet — no processing fees.</p>
      <div className="crypto-grid" role="radiogroup" aria-label="Choose a coin">
        {CRYPTO_ASSETS.map((a) => (
          <button key={a.id} type="button" role="radio" aria-checked={a.id === assetId} className={a.id === assetId ? "on" : ""} onClick={() => setAssetId(a.id)}>
            <strong>{a.symbol}</strong><small>{a.network}</small>
          </button>
        ))}
      </div>
      <div className="crypto-wallet">
        <img alt={`QR code for the CCAK ${asset.symbol} wallet`} width={160} height={160} src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(asset.wallet)}`} />
        <div>
          <p><strong>Amount:</strong> KES {Math.round(amountKes).toLocaleString()}{approx ? ` ≈ ${approx} ${asset.symbol} (live rate, approximate)` : " — live rate unavailable; check the KES value in your wallet"}</p>
          <p className="crypto-warning">Send only <strong>{asset.symbol}</strong> on <strong>{asset.network}</strong>. Other networks may lose the funds.</p>
          <code className="crypto-address">{asset.wallet}</code>
          <Button type="button" variant="outline" onClick={copy}>{copied ? "Copied" : "Copy address"}</Button>
        </div>
      </div>
      <form className="portal-form" onSubmit={submit}>
        <label>Transaction ID (hash)<input name="txid" required minLength={40} maxLength={122} autoComplete="off" /></label>
        <label>Your name (optional)<input name="payer_name" maxLength={120} autoComplete="name" /></label>
        <label>Phone or email (optional)<input name="payer_contact" maxLength={160} /></label>
        <Button className="btn btn-forest" type="submit" disabled={busy}>{busy ? "Submitting…" : "I have sent the payment"}</Button>
        {msg && <p role="status" className={`portal-msg${msg.ok ? " ok" : ""}`}>{msg.text}</p>}
      </form>
    </section>
  );
}
