/**
 * Safaricom Daraja (M-Pesa) client – STK Push for member contributions.
 * Credentials must live only in server env (never VITE_).
 * Sandbox shortcode 174379 is used when DARAJA_ENV=sandbox.
 */

import { z } from "zod";
import { normaliseMpesaPhone } from "./rules";
export { normaliseMpesaPhone } from "./rules";

export function requireDarajaConfiguration() {
  for (const name of ["DARAJA_CONSUMER_KEY", "DARAJA_CONSUMER_SECRET", "DARAJA_SHORTCODE", "DARAJA_PASSKEY"]) {
    if (!process.env[name]) throw new Error("M-Pesa payments are not activated yet. Please contact CCAK.");
  }
}

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

  if (!res.ok) throw new Error("M-Pesa could not start the payment. Please try again.");
  const data = z.object({
    ResponseCode: z.literal("0"), MerchantRequestID: z.string().min(1),
    CheckoutRequestID: z.string().min(1), ResponseDescription: z.string(), CustomerMessage: z.string(),
  }).parse(await res.json());

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
  mpesaReceiptNumber?: string | undefined;
  amount?: number | undefined;
  phone?: string | undefined;
  transactionDate?: string | undefined;
} {
  const root = z.object({ Body: z.object({ stkCallback: z.object({
    MerchantRequestID: z.string().min(1).max(100), CheckoutRequestID: z.string().min(1).max(100),
    ResultCode: z.number().int(), ResultDesc: z.string().max(1000),
    CallbackMetadata: z.object({ Item: z.array(z.object({ Name: z.string().max(100), Value: z.union([z.string().max(100), z.number()]).optional() })).max(20) }).optional(),
  }) }) }).parse(body);
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

/** Independently confirm the outcome with Safaricom; callbacks alone are untrusted. */
export async function queryStkResult(checkoutRequestId: string): Promise<number> {
  const shortcode = requireEnv("DARAJA_SHORTCODE");
  const ts = timestamp();
  const token = await getDarajaAccessToken();
  const res = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ BusinessShortCode: shortcode, Password: stkPassword(shortcode, requireEnv("DARAJA_PASSKEY"), ts), Timestamp: ts, CheckoutRequestID: checkoutRequestId }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Payment confirmation is temporarily unavailable.");
  return z.object({ ResultCode: z.coerce.number().int() }).parse(await res.json()).ResultCode;
}
