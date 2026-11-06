import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const COUNTIES = ["Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"];
export const MEMBER_TYPES = [
  ["farmer", "Farmer"], ["cooperative", "Cooperative"], ["barista", "Barista"], ["roaster", "Roaster"],
  ["trader", "Trader / exporter"], ["enterprise", "Coffee enterprise"], ["other", "Other"],
] as const;

export const registrationSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, "Enter a valid phone number"),
  county: z.string().refine((v) => COUNTIES.includes(v), "Choose a Kenyan county"),
  sub_county: z.string().trim().max(80).optional().default(""),
  member_type: z.enum(["farmer", "cooperative", "barista", "roaster", "trader", "enterprise", "other"]),
  business_name: z.string().trim().max(150).optional().default(""),
  farm_size: z.string().trim().max(60).optional().default(""),
});

export const applicationSchema = registrationSchema.extend({
  terms_accepted: z.literal(true, { errorMap: () => ({ message: "Accept the membership terms" }) }),
  photo_path: z.string().max(300).nullable().optional(),
  supporting_documents: z.array(z.string().max(300)).max(5).default([]),
});

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
