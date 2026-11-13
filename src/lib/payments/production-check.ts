export type ReadinessItem = { name: string; ok: boolean; message: string };
export type ProductionReadiness = { ready: boolean; checks: ReadinessItem[]; nextSteps: string[]; checkedAt: string };

const SANDBOX_SHORTCODE = "174379";
const TYPES = ["CustomerBuyGoodsOnline", "CustomerPayBillOnline"];

/** Read-only: only a live OAuth GET is ever sent. No STK push, no charges, no database writes. */
export async function checkDarajaProduction(
  config: Record<string, string | undefined>,
  request: typeof fetch = fetch,
): Promise<ProductionReadiness> {
  const checks: ReadinessItem[] = [];
  const nextSteps: string[] = [];
  const add = (name: string, ok: boolean, pass: string, fail: string, step?: string) => {
    checks.push({ name, ok, message: ok ? pass : fail });
    if (!ok && step) nextSteps.push(step);
  };

  add("Live mode", config["DARAJA_ENV"] === "production", "Live payments mode is selected.",
    config["DARAJA_ENV"] === "sandbox" ? "Still in test mode — members cannot pay real money yet." : "Payment mode is not set.",
    "Set DARAJA_ENV to production.");
  const type = config["DARAJA_TRANSACTION_TYPE"] ?? "";
  add("Payment type", TYPES.includes(type),
    type === "CustomerBuyGoodsOnline" ? "Lipa na M-Pesa Till (Buy Goods) selected." : "PayBill selected.",
    "Till or PayBill type is not set.", "Set DARAJA_TRANSACTION_TYPE to CustomerBuyGoodsOnline for a Till.");
  for (const [key, label] of [["DARAJA_CONSUMER_KEY", "Consumer key"], ["DARAJA_CONSUMER_SECRET", "Consumer secret"], ["DARAJA_PASSKEY", "Live passkey"]] as const) {
    add(label, Boolean(config[key]), "Securely saved.", "Not saved.", `Save the live ${label.toLowerCase()} from your Daraja production app.`);
  }
  const code = config["DARAJA_SHORTCODE"] ?? "";
  add("Store / shortcode", /^\d{5,8}$/.test(code) && code !== SANDBOX_SHORTCODE, "Live shortcode saved.",
    code === SANDBOX_SHORTCODE ? "This is Safaricom's test shortcode, not CCAK's." : "Missing or not a valid number.",
    "Save the store/shortcode your live passkey was issued for.");
  const till = config["DARAJA_PARTY_B"];
  if (type === "CustomerBuyGoodsOnline") {
    add("Till number", !till || /^\d{5,8}$/.test(till),
      till ? "Payments go to the saved Till number." : "Payments go to the shortcode (same as the Till).",
      "Till number is not a valid number.", "Correct DARAJA_PARTY_B to your Till number.");
  }

  const credsOk = checks.every((c) => c.ok);
  if (credsOk) {
    try {
      const res = await request("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
        method: "GET", redirect: "manual", signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Basic ${btoa(`${config["DARAJA_CONSUMER_KEY"]}:${config["DARAJA_CONSUMER_SECRET"]}`)}` },
      });
      const body: unknown = res.ok ? await res.json() : null;
      const ok = typeof body === "object" && body !== null && "access_token" in body && typeof body.access_token === "string" && Boolean(body.access_token);
      add("Safaricom live access", ok, "Safaricom accepted the live credentials. No payment was sent.",
        res.status === 401 || res.status === 403 ? "Safaricom rejected these keys — they may be test keys." : "Safaricom could not confirm the keys. Try again later.",
        "Use the consumer key and secret from the production (Go-Live) app.");
    } catch {
      add("Safaricom live access", false, "", "Could not reach Safaricom. Try again later.");
    }
  } else {
    checks.push({ name: "Safaricom live access", ok: false, message: "Skipped until the items above pass." });
  }
  const ready = checks.every((c) => c.ok);
  if (ready) nextSteps.push("Make one small real payment (e.g. KES 1) to confirm money reaches the Till.");
  return { ready, checks, nextSteps, checkedAt: new Date().toISOString() };
}
