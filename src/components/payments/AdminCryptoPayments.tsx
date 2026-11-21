import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cryptoAsset } from "@/lib/payments/crypto";
import type { Tables } from "@/integrations/supabase/types";

/** National-admin review of crypto submissions against the public blockchain explorer. */
export function AdminCryptoPayments() {
  const [rows, setRows] = useState<Tables<"crypto_payments">[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const load = async () => {
    const { data, error } = await supabase.from("crypto_payments").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) setMsg("Could not load crypto payments."); else setRows(data ?? []);
  };
  useEffect(() => { void load(); }, []);
  const review = async (id: string, decision: "verified" | "rejected") => {
    const note = decision === "rejected" ? window.prompt("Reason for rejection") ?? "" : "";
    if (decision === "rejected" && !note.trim()) return;
    const { error } = await supabase.rpc("review_crypto_payment", { payment_id: id, decision, ...(note ? { note } : {}) });
    setMsg(error ? error.message : `Payment marked ${decision}.`);
    void load();
  };
  return (
    <div className="admin-table">
      <p className="section-note">Open each transaction on the explorer and confirm the coin, network, amount and CCAK wallet before verifying.</p>
      {msg && <p role="status">{msg}</p>}
      {rows.length === 0 && <p>No crypto payments yet.</p>}
      {rows.map((r) => {
        const a = cryptoAsset(r.asset_id);
        return (
          <div key={r.id} className="admin-row">
            <strong>{a?.symbol ?? r.asset_id} · KES {r.amount_kes.toLocaleString()} {r.amount_crypto_approx && `(≈ ${r.amount_crypto_approx})`} · {r.purpose}</strong>
            <div>{r.payer_name || "Anonymous"} {r.payer_contact && `· ${r.payer_contact}`} {r.reference && `· Ref ${r.reference}`}</div>
            <div><a href={`${a?.explorerBase ?? ""}${r.txid}`} target="_blank" rel="noreferrer">View on explorer</a> · <code>{r.txid.slice(0, 18)}…</code></div>
            <small>{new Date(r.created_at).toLocaleString()} · Status: {r.status}{r.review_note && ` · ${r.review_note}`}</small>
            {r.status === "pending" && <div className="flex gap-2 mt-2"><Button size="sm" onClick={() => review(r.id, "verified")}>Mark verified</Button><Button size="sm" variant="outline" onClick={() => review(r.id, "rejected")}>Reject</Button></div>}
          </div>
        );
      })}
    </div>
  );
}
