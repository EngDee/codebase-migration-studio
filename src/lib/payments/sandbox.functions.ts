import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canRunSandboxCheck, checkDarajaSandbox } from "./sandbox-check";

export const runDarajaSandboxCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: roles, error } = await context.supabase.from("user_roles")
      .select("role").eq("user_id", context.userId);
    if (error || !canRunSandboxCheck((roles ?? []).map((row) => row.role))) {
      throw new Error("Only national administrators can run this check.");
    }
    return checkDarajaSandbox({
      DARAJA_ENV: process.env["DARAJA_ENV"],
      DARAJA_CONSUMER_KEY: process.env["DARAJA_CONSUMER_KEY"],
      DARAJA_CONSUMER_SECRET: process.env["DARAJA_CONSUMER_SECRET"],
      DARAJA_SHORTCODE: process.env["DARAJA_SHORTCODE"],
      DARAJA_PASSKEY: process.env["DARAJA_PASSKEY"],
    });
  });