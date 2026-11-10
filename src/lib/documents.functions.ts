import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Signed, short-lived link to the CCAK constitution; storage RLS only allows approved members with a member number. */
export const getConstitutionLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("status, member_no")
      .eq("id", context.userId)
      .single();
    if (!profile || profile.status !== "approved" || !profile.member_no) {
      throw new Error("The constitution is available to verified, approved members only.");
    }
    const { data, error } = await context.supabase.storage
      .from("member-documents")
      .createSignedUrl("CCAK_CONSTITUTION_2026.pdf", 600);
    if (error || !data) throw new Error("Could not open the constitution. Please try again.");
    return { url: data.signedUrl };
  });
