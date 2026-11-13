import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canRunSandboxCheck } from "./sandbox-check";
import { checkDarajaProduction } from "./production-check";

export const runDarajaProductionCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: roles, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (error || !canRunSandboxCheck((roles ?? []).map((r) => r.role))) throw new Error("Only national administrators can run this check.");
    const names = ["DARAJA_ENV", "DARAJA_TRANSACTION_TYPE", "DARAJA_CONSUMER_KEY", "DARAJA_CONSUMER_SECRET", "DARAJA_SHORTCODE", "DARAJA_PASSKEY", "DARAJA_PARTY_B"];
    return checkDarajaProduction(Object.fromEntries(names.map((n) => [n, process.env[n]])));
  });
