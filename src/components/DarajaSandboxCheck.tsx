import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CircleX, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runDarajaSandboxCheck } from "@/lib/payments/sandbox.functions";
import type { SandboxCheckResult } from "@/lib/payments/sandbox-check";

export function DarajaSandboxCheck() {
  const runCheck = useServerFn(runDarajaSandboxCheck);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SandboxCheckResult | null>(null);
  const [error, setError] = useState("");
  const run = async () => {
    setBusy(true); setError(""); setResult(null);
    try { setResult(await runCheck()); }
    catch { setError("Check could not run. Confirm your national administrator access and try again."); }
    finally { setBusy(false); }
  };

  return (
    <section className="space-y-5 border-t border-border pt-6" aria-labelledby="daraja-heading">
      <div>
        <h2 id="daraja-heading" className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck aria-hidden="true" />Daraja sandbox check</h2>
        <p className="mt-2">No charges · No phone prompts · No member payment records</p>
      </div>
      <Button className="btn btn-forest" disabled={busy} onClick={run}>
        {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
        {busy ? "Checking sandbox…" : "Run sandbox check"}
      </Button>
      <div aria-live="polite" aria-busy={busy}>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {result && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{result.ok ? "Sandbox access confirmed" : "Sandbox check failed"}</h3>
            <ul className="divide-y divide-border">
              {result.checks.map((check) => (
                <li key={check.name} className="flex items-start gap-3 py-3">
                  {check.ok ? <CheckCircle2 className="mt-1 size-5 shrink-0 text-foreground" aria-hidden="true" /> : <CircleX className="mt-1 size-5 shrink-0 text-destructive" aria-hidden="true" />}
                  <div className="min-w-0"><strong>{check.name} — {check.ok ? "Passed" : "Failed"}</strong><p className="mt-1 break-words">{check.message}</p></div>
                </li>
              ))}
            </ul>
            <p className="text-sm">Shortcode and passkey presence only is checked; payment processing and callbacks are not tested.</p>
            <p className="text-sm">Checked {new Date(result.checkedAt).toLocaleString()}</p>
          </div>
        )}
      </div>
    </section>
  );
}