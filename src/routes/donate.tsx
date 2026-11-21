import { CryptoPayment } from "@/components/payments/CryptoPayment";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import ccakLogo from "@/assets/ccak-logo.png.asset.json";
import { donationSchema, MIN_DONATION_KES } from "@/lib/donations/rules";
import { getDonationStatus, startDonation } from "@/lib/donations/donations.functions";

export const Route = createFileRoute("/donate")({
  head: () => ({ meta: [
    { title: "Donate with M-Pesa — CCAK" },
    { name: "description", content: "Support Kenya's coffee champions with an M-Pesa donation from KES 100." },
    { property: "og:title", content: "Donate with M-Pesa — CCAK" },
    { property: "og:description", content: "Fund training, value addition and farmer grants with the Coffee Champions Association of Kenya." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Donate,
});

const PRESETS = [100, 500, 1000, 2500];

function Donate() {
  const start = useServerFn(startDonation);
  const status = useServerFn(getDonationStatus);
  const [amount, setAmount] = useState("500");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [donation, setDonation] = useState<{ id: string; status: string; mpesa_receipt?: string | null } | null>(null);

  useEffect(() => {
    if (!donation || donation.status !== "pending") return;
    const timer = setInterval(async () => {
      try { const r = await status({ data: { id: donation.id } }); setDonation({ id: donation.id, ...r }); } catch { /* keep waiting */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [donation, status]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    const parsed = donationSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your details."); return; }
    setBusy(true);
    try { const r = await start({ data: parsed.data }); setDonation({ id: r.id, status: "pending" }); }
    catch (e) { setError(e instanceof Error ? e.message : "Donation could not be started."); }
    finally { setBusy(false); }
  };

  return <div className="portal shop-page">
    <header className="portal-top"><Link to="/" className="logo"><img className="logo-mark" src={ccakLogo.url} alt="CCAK logo" /><span className="logo-text"><strong>Coffee Champions</strong><small>Association of Kenya</small></span></Link><Button asChild variant="ghost" className="btn btn-ghost"><Link to="/">Back home</Link></Button></header>
    <main className="portal-main">
      <h1>Support CCAK</h1>
      <p>Your donation funds training, value addition and farmer grants. Minimum KES {MIN_DONATION_KES}.</p>
      {error && <p className="portal-msg" role="alert">{error}</p>}
      <div aria-live="polite">
        {donation?.status === "pending" && <p className="portal-msg" role="status">Check your phone and enter your M-Pesa PIN to complete the donation. This page updates automatically.</p>}
        {donation?.status === "paid" && <p className="portal-msg" role="status">Thank you! Your donation was received{donation.mpesa_receipt ? ` (M-Pesa ref ${donation.mpesa_receipt})` : ""}.</p>}
        {donation?.status === "failed" && <p className="portal-msg" role="alert">The payment was not completed. You can try again below.</p>}
      </div>
      {donation?.status !== "pending" && donation?.status !== "paid" && <form className="portal-form" onSubmit={submit}>
        <fieldset><legend>Choose an amount (KES)</legend>
          <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <Button key={p} type="button" variant={amount === String(p) ? "default" : "outline"} onClick={() => setAmount(String(p))}>KES {p.toLocaleString()}</Button>)}</div>
        </fieldset>
        <label>Amount (KES)<input name="amount_kes" type="number" inputMode="numeric" min={MIN_DONATION_KES} step={1} required value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label>M-Pesa phone number<input name="phone" type="tel" autoComplete="tel" placeholder="07XX XXX XXX" required minLength={9} maxLength={20} /></label>
        <label>Your name (optional)<input name="donor_name" autoComplete="name" maxLength={120} /></label>
        <Button className="btn btn-forest" type="submit" disabled={busy}><HeartHandshake aria-hidden="true" />{busy ? "Sending prompt…" : `Donate KES ${Number(amount || 0).toLocaleString()} with M-Pesa`}</Button>
      </form>}
      <CryptoPayment amountKes={Number(amount) || 0} purpose="donation" />
    </main>
  </div>;
}
