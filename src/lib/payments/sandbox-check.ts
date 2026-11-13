export type SandboxCheckResult = {
  ok: boolean;
  checks: { name: string; ok: boolean; message: string }[];
  checkedAt: string;
};

export function canRunSandboxCheck(roles: readonly string[]): boolean {
  return roles.some((role) => ["admin", "super_admin", "national_admin"].includes(role));
}

/** Read-only diagnostic: never calls STK, production, or a database writer. */
export async function checkDarajaSandbox(
  config: Record<string, string | undefined>,
  request: typeof fetch = fetch,
): Promise<SandboxCheckResult> {
  const checks: SandboxCheckResult["checks"] = [];
  const finish = (): SandboxCheckResult => ({
    ok: checks.every((check) => check.ok), checks, checkedAt: new Date().toISOString(),
  });
  // This diagnostic only ever calls Safaricom's sandbox OAuth URL, so it is safe
  // regardless of the site's payment mode; real payments keep using DARAJA_ENV.
  const env = config["DARAJA_ENV"];
  const envKnown = !env || env === "sandbox" || env === "production";
  checks.push({ name: "Sandbox mode", ok: envKnown, message: envKnown
    ? env === "production"
      ? "Testing Safaricom's sandbox only; real payments stay in live mode."
      : "Sandbox mode confirmed."
    : "Check blocked: DARAJA_ENV must be sandbox or production before testing." });
  if (!envKnown) return finish();

  for (const [name, label] of [
    ["DARAJA_CONSUMER_KEY", "Consumer key"],
    ["DARAJA_CONSUMER_SECRET", "Consumer secret"],
    ["DARAJA_SHORTCODE", "Business shortcode"],
    ["DARAJA_PASSKEY", "Online payment passkey"],
  ]) {
    if (!name || !label) continue;
    const saved = Boolean(config[name]);
    checks.push({ name: label, ok: saved, message: saved ? "Securely saved." : "Not configured. Add it securely before testing." });
  }
  if (checks.some((check) => !check.ok)) return finish();

  try {
    const response = await request("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      method: "GET",
      headers: { Authorization: `Basic ${btoa(`${config["DARAJA_CONSUMER_KEY"]}:${config["DARAJA_CONSUMER_SECRET"]}`)}` },
      signal: AbortSignal.timeout(15000),
      redirect: "manual",
    });
    if (!response.ok) {
      checks.push({ name: "Safaricom sandbox access", ok: false, message: response.status === 401 || response.status === 403
        ? "Safaricom rejected sandbox access. Check that both credentials belong to the same sandbox app."
        : "Safaricom sandbox could not complete the check. Try again later." });
      return finish();
    }
    // Tokens and provider error bodies must never leave this function.
    const body: unknown = await response.json();
    const valid = typeof body === "object" && body !== null && "access_token" in body
      && typeof body.access_token === "string" && Boolean(body.access_token);
    checks.push({ name: "Safaricom sandbox access", ok: valid, message: valid
      ? "Sandbox authentication succeeded. No payment request was sent."
      : "Safaricom returned an unexpected authentication response. Try again later." });
  } catch {
    checks.push({ name: "Safaricom sandbox access", ok: false, message: "Sandbox connection failed or timed out. Try again later." });
  }
  return finish();
}