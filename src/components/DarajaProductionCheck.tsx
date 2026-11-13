import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CircleX, LoaderCircle, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runDarajaProductionCheck } from "@/lib/payments/production.functions";
import type { ProductionReadiness } from "@/lib/payments/production-check";

export function DarajaProductionCheck() {
  const runCheck = useServerFn(runDarajaProductionCheck);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProductionReadiness | null>(null);
  const [error, setError] = useState("");
  const run = async () => {
    setBusy(true); setError(""); setResult(null);
    try { setResult(await runCheck()); }
    catch { setError("Check could not run. Confirm your national administrator access and try again."); }
    finally { setBusy(false); }
  };
  return (
    <section className="space-y-5 pt-6" aria-labelledby="prod-heading">
      <div>
        <h2 id="prod-heading" className="flex items-center gap-2 text-xl font-semibold"><Rocket aria-hidden="true" />Live M-Pesa readiness</h2>
        <p className="mt-2">Checks your Till setup with Safaricom · No charges · No phone prompts</p>
      </div>
      <Button className="btn btn-forest" disabled={busy} onClick={run}>
        {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Rocket aria-hidden="true" />}
        {busy ? "Checking…" : "Check live readiness"}
      </Button>
      <div aria-live="polite" aria-busy={busy}>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {result && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{result.ready ? "Ready for live payments" : "Not ready for live payments yet"}</h3>
            <ul className="divide-y divide-border">
              {result.checks.map((c) => (
                <li key={c.name} className="flex items-start gap-3 py-3">
                  {c.ok ? <CheckCircle2 className="mt-1 size-5 shrink-0" aria-hidden="true" /> : <CircleX className="mt-1 size-5 shrink-0 text-destructive" aria-hidden="true" />}
                  <div className="min-w-0"><strong>{c.name} — {c.ok ? "Passed" : "Needs attention"}</strong><p className="mt-1 break-words">{c.message}</p></div>
                </li>
              ))}
            </ul>
            {result.nextSteps.length > 0 && (
              <div><h4 className="font-semibold">What is still needed</h4>
                <ol className="mt-2 list-decimal space-y-1 pl-5">{result.nextSteps.map((s) => <li key={s}>{s}</li>)}</ol></div>
            )}
            <p className="text-sm">Checked {new Date(result.checkedAt).toLocaleString()}</p>
          </div>
        )}
      </div>
    </section>
  );
}
