/**
 * Safaricom Daraja (M-Pesa) client – STK Push for member contributions.
 * Credentials must live only in server env (never VITE_).
 * Sandbox shortcode 174379 is used when DARAJA_ENV=sandbox.
 */

const SANDBOX_BASE = "https://sandbox.safaricom.co.ke";
const PROD_BASE = "https://api.safaricom.co.ke";

function baseUrl() {
  return process.env["DARAJA_ENV"] === "production" ? PROD_BASE : SANDBOX_BASE;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

/** OAuth access token (cached briefly in memory). */
let tokenCache: { token: string; expiresAt: number } | null = null;

export async function getDarajaAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 30_000) {
    return tokenCache.token;
  }
  const key = requireEnv("DARAJA_CONSUMER_KEY");
  const secret = requireEnv("DARAJA_CONSUMER_SECRET");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daraja OAuth failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: string };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in) * 1000,
  };
  return data.access_token;
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

function stkPassword(shortcode: string, passkey: string, ts: string): string {
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
}

/** Normalise Kenyan phone to 2547XXXXXXXX / 2541XXXXXXXX. */
export function normaliseMpesaPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254") && (digits.length === 12 || digits.length === 13)) {
    return digits.slice(0, 12);
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    return `254${digits}`;
  }
  throw new Error("Enter a valid Kenyan M-Pesa number (e.g. 07XX XXX XXX).");
}

export type StkPushInput = {
  amount: number;
  phone: string;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
};

export type StkPushResult = {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
};

export async function initiateStkPush(input: StkPushInput): Promise<StkPushResult> {
  const shortcode = requireEnv("DARAJA_SHORTCODE");
  const passkey = requireEnv("DARAJA_PASSKEY");
  const phone = normaliseMpesaPhone(input.phone);
  const amount = Math.max(1, Math.round(input.amount));
  const ts = timestamp();
  const token = await getDarajaAccessToken();

  const body = {
    BusinessShortCode: shortcode,
    Password: stkPassword(shortcode, passkey, ts),
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: input.callbackUrl,
    AccountReference: input.accountReference.slice(0, 12),
    TransactionDesc: input.transactionDesc.slice(0, 13),
  };

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, string>;
  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(
      data.errorMessage || data.ResponseDescription || `STK Push failed (${res.status})`,
    );
  }

  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    customerMessage: data.CustomerMessage,
  };
}

/** Parse Safaricom STK callback body. */
export function parseStkCallback(body: unknown): {
  success: boolean;
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: number;
  resultDesc: string;
  mpesaReceiptNumber?: string;
  amount?: number;
  phone?: string;
  transactionDate?: string;
} {
  const root = body as {
    Body?: {
      stkCallback?: {
        MerchantRequestID?: string;
        CheckoutRequestID?: string;
        ResultCode?: number;
        ResultDesc?: string;
        CallbackMetadata?: { Item?: Array<{ Name: string; Value?: string | number }> };
      };
    };
  };
  const cb = root?.Body?.stkCallback;
  if (!cb) throw new Error("Invalid STK callback payload");

  const items = cb.CallbackMetadata?.Item ?? [];
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;

  return {
    success: cb.ResultCode === 0,
    checkoutRequestId: cb.CheckoutRequestID ?? "",
    merchantRequestId: cb.MerchantRequestID ?? "",
    resultCode: cb.ResultCode ?? -1,
    resultDesc: cb.ResultDesc ?? "",
    mpesaReceiptNumber: get("MpesaReceiptNumber") as string | undefined,
    amount: get("Amount") != null ? Number(get("Amount")) : undefined,
    phone: get("PhoneNumber") != null ? String(get("PhoneNumber")) : undefined,
    transactionDate: get("TransactionDate") != null ? String(get("TransactionDate")) : undefined,
  };
}
