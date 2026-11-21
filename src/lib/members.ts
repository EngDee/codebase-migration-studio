import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const COUNTIES = ["Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"];
export const MEMBER_TYPES = [
  ["ccak_member", "CCAK Member"],
  ["farmer", "Farmer"], ["cooperative", "Cooperative"], ["barista", "Barista"], ["roaster", "Roaster"],
  ["trader", "Trader / exporter"], ["enterprise", "Coffee enterprise"], ["other", "Other"],
] as const;

export const CONSTITUTIONAL_POSITIONS = [
  { id: "president", label: "National President / Chairperson", category: "National Executive Committee" },
  { id: "deputy_president", label: "Deputy President", category: "National Executive Committee" },
  { id: "sec_gen", label: "Secretary-General", category: "National Executive Committee" },
  { id: "deputy_sec_gen", label: "Deputy Secretary-General", category: "National Executive Committee" },
  { id: "treasurer", label: "National Treasurer", category: "National Executive Committee" },
  { id: "nat_coordinator", label: "Organizing Secretary / National Coordinator", category: "National Executive Committee" },
  { id: "director_rd", label: "Director of Research & Development", category: "Directorate & Secretariat" },
  { id: "manager_marketing", label: "Communications & Marketing Manager", category: "Directorate & Secretariat" },
  { id: "manager_hr", label: "Human Resource Manager", category: "Directorate & Secretariat" },
  { id: "exec_member", label: "Executive Committee Member", category: "Directorate & Secretariat" },
  { id: "county_coordinator", label: "County Coordinator", category: "County & Grassroots Leadership" },
  { id: "county_sec", label: "County Secretary", category: "County & Grassroots Leadership" },
  { id: "county_treasurer", label: "County Treasurer", category: "County & Grassroots Leadership" },
  { id: "county_youth_rep", label: "County Youth Coordinator", category: "County & Grassroots Leadership" },
  { id: "county_women_rep", label: "County Women Representative", category: "County & Grassroots Leadership" },
  { id: "coffee_champion", label: "Certified Coffee Champion", category: "Professional Field & General Assembly" },
  { id: "coop_society_rep", label: "Cooperative Society Representative", category: "Professional Field & General Assembly" },
  { id: "ordinary_member", label: "Ordinary Member / General Assembly Delegate", category: "Professional Field & General Assembly" },
] as const;
export type PositionId = (typeof CONSTITUTIONAL_POSITIONS)[number]["id"];
export const POSITION_IDS = CONSTITUTIONAL_POSITIONS.map((p) => p.id) as [PositionId, ...PositionId[]];
export function positionLabel(id: string | null | undefined) {
  return CONSTITUTIONAL_POSITIONS.find((p) => p.id === id)?.label ?? null;
}

export const registrationBaseSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, "Enter a valid phone number"),
  county: z.string().refine((v) => COUNTIES.includes(v), "Choose a Kenyan county"),
  sub_county: z.string().trim().max(80).optional().default(""),
  member_type: z.enum(["ccak_member", "farmer", "cooperative", "barista", "roaster", "trader", "enterprise", "other"]),
  national_id: z.string().trim().regex(/^[0-9]{6,10}$/, "Enter a valid National ID (6 to 10 digits)"),
  gender: z.enum(["female", "male", "other", "prefer_not_to_say"], { error: "Choose a gender option" }),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth").refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value < today;
  }, "Enter a valid date of birth in the past"),
  business_name: z.string().trim().max(150).optional().default(""),
  farm_size: z.string().trim().max(60).optional().default(""),
  position: z.union([z.enum(POSITION_IDS), z.literal("")]).optional().default(""),
});
const needsPosition = (v: { member_type: string; position?: string }) => v.member_type !== "ccak_member" || Boolean(v.position);
const positionIssue = { message: "Choose your constitutional position", path: ["position"] };
export const registrationSchema = registrationBaseSchema.refine(needsPosition, positionIssue);

export const applicationSchema = registrationBaseSchema.extend({
  terms_accepted: z.literal(true, { error: "Accept the membership terms" }),
  photo_path: z.string().max(300).nullable().optional(),
  supporting_documents: z.array(z.string().max(300)).max(5).default([]),
}).refine(needsPosition, positionIssue);

export const reviewSchema = z.object({
  application_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(2000).default(""),
}).refine((v) => v.decision !== "rejected" || v.notes.length > 0, {
  message: "A rejection reason is required", path: ["notes"],
});

export function hasStaffRole(roles: string[]) {
  return roles.some((role) => ["admin", "super_admin", "national_admin", "county_admin"].includes(role));
}

export const inquirySchema = z.object({
  kind: z.enum(["partner", "donate"]),
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(20).optional(),
  county: z.string().max(40).optional(),
  message: z.string().trim().max(1000).optional(),
});

export async function getMyRoles(userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role);
}

export async function photoUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("member-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
