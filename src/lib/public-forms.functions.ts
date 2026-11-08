import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { newsletterSchema, publicInquirySchema } from "./public-form-schemas";

/**
 * Simple in-memory rate limiter for public form submissions.
 * Limits each IP (or fallback key) to a small number of attempts per rolling window.
 * Suitable for single-instance deployments. For multi-instance production use
 * Redis / Upstash / Cloudflare Rate Limiting or a Supabase Edge Function.
 */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 8;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(): string {
  try {
    const req = getRequest();
    const headers = req?.headers;
    if (headers) {
      const forwarded =
        headers.get("cf-connecting-ip") ||
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headers.get("x-real-ip");
      if (forwarded) return `ip:${forwarded}`;
    }
  } catch {
    // ignore when request context is unavailable
  }
  return "global";
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(key, bucket);
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true };
}

let lastCleanup = 0;
function maybeCleanupBuckets() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [k, b] of rateBuckets) {
    if (now >= b.resetAt) rateBuckets.delete(k);
  }
}

export const savePublicForm = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const envelope = input as { kind?: unknown } | null;
    return envelope?.kind === "newsletter"
      ? { kind: "newsletter" as const, ...newsletterSchema.parse(input) }
      : publicInquirySchema.parse(input);
  })
  .handler(async ({ data }) => {
    maybeCleanupBuckets();
    const key = getClientKey();
    const limit = checkRateLimit(key);
    if (!limit.allowed) {
      throw new Error(
        `Too many submissions. Please try again in a few minutes${
          limit.retryAfterSec ? ` (~${limit.retryAfterSec}s)` : ""
        }.`,
      );
    }

    const url = process.env["SUPABASE_URL"];
    const keyEnv = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !keyEnv) throw new Error("Submissions are unavailable. Please try again later.");

    const client = createClient<Database>(url, keyEnv, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (keyEnv.startsWith("sb_") && headers.get("Authorization") === `Bearer ${keyEnv}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", keyEnv);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const result =
      data.kind === "newsletter"
        ? await client.from("newsletter_subscribers").insert({ email: data.email })
        : await client.from("inquiries").insert({
            kind: data.kind,
            full_name: data.full_name,
            email: data.email,
            phone: data.phone || null,
            county: data.county || null,
            message: data.message || null,
          });

    if (result.error) {
      if (data.kind === "newsletter" && result.error.code === "23505") {
        return { message: "This email is already subscribed." };
      }
      throw new Error("We could not save your submission. Please try again.");
    }

    return {
      message:
        data.kind === "newsletter"
          ? "Your newsletter subscription has been saved."
          : "Your inquiry has been saved. Thank you.",
    };
  });
