import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applicationSchema, reviewSchema, registrationSchema, hasStaffRole } from "@/lib/members";
import { z } from "zod";

export const getMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, applications, roles] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
      context.supabase.from("membership_applications").select("*").eq("applicant_user_id", context.userId).order("submission_date", { ascending: false }),
      context.supabase.from("user_roles").select("role,county").eq("user_id", context.userId),
    ]);
    if (profile.error || applications.error || roles.error) throw new Error("Could not load membership details.");
    return { profile: profile.data, applications: applications.data, roles: roles.data };
  });

export const submitApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => applicationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: application, error } = await context.supabase.rpc("submit_membership_application", { payload: data });
    if (error || !application) throw new Error("Application was not saved. Check your details and whether an application is already pending.");
    return application;
  });

export const updateMemberDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registrationSchema.extend({ photo_path: z.string().max(300).nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.photo_path && !data.photo_path.startsWith(`${context.userId}/`)) throw new Error("Invalid photo.");
    const { data: profile, error } = await context.supabase.from("profiles").update(data).eq("id", context.userId).select("*").single();
    if (error || !profile) throw new Error("Your details were not saved.");
    return profile;
  });

export const getAdministration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (error || !hasStaffRole((roles ?? []).map((r) => r.role))) throw new Error("Not authorised.");
    const national = (roles ?? []).some((r) => r.role !== "member" && r.role !== "county_admin");
    const [members, applications, inquiries, subscribers] = await Promise.all([
      context.supabase.from("profiles").select("*").order("submitted_at", { ascending: false, nullsFirst: false }),
      context.supabase.from("membership_applications").select("*").order("submission_date", { ascending: false }),
      national ? context.supabase.from("inquiries").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      national ? context.supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (members.error || applications.error || inquiries.error || subscribers.error) throw new Error("Could not load administration records.");
    return { members: members.data, applications: applications.data, inquiries: inquiries.data, subscribers: subscribers.data };
  });

export const reviewApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: application, error } = await context.supabase.rpc("review_membership_application", {
      application_id: data.application_id, decision: data.decision, notes: data.notes,
    });
    if (error || !application) throw new Error("The decision was not saved. Check permissions and whether this application is still pending.");
    return application;
  });

export const assignMembershipRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ target_user: z.string().uuid(), new_role: z.enum(["super_admin", "national_admin", "county_admin", "member"]), assigned_county: z.string().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("assign_membership_role", data);
    if (error) throw new Error("Role assignment was not saved.");
    return { saved: true };
  });