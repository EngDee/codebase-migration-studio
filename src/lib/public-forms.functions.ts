import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { newsletterSchema, publicInquirySchema } from "./public-form-schemas";

export const savePublicForm = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const envelope = input as { kind?: unknown } | null;
    return envelope?.kind === "newsletter"
      ? { kind: "newsletter" as const, ...newsletterSchema.parse(input) }
      : publicInquirySchema.parse(input);
  })
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Submissions are unavailable. Please try again later.");
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const result = data.kind === "newsletter"
      ? await client.from("newsletter_subscribers").insert({ email: data.email })
      : await client.from("inquiries").insert({
        kind: data.kind, full_name: data.full_name, email: data.email,
        phone: data.phone || null, county: data.county || null, message: data.message || null,
      });
    if (result.error) {
      if (data.kind === "newsletter" && result.error.code === "23505") return { message: "This email is already subscribed." };
      throw new Error("We could not save your submission. Please try again.");
    }
    return { message: data.kind === "newsletter" ? "Your newsletter subscription has been saved." : "Your inquiry has been saved. Thank you." };
  });