import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const COUNTIES = ["Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Embu", "Meru", "Tharaka-Nithi", "Machakos", "Bungoma", "Kisii", "Nyamira", "Kericho", "Nandi", "Trans Nzoia", "Kakamega"];
export const MEMBER_TYPES = [
  ["farmer", "Farmer"], ["cooperative", "Cooperative"], ["barista", "Barista"], ["roaster", "Roaster"],
  ["trader", "Trader / exporter"], ["enterprise", "Coffee enterprise"], ["other", "Other"],
] as const;

export const registrationSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, "Enter a valid phone number"),
  county: z.string().min(1, "Choose a county").max(40),
  member_type: z.enum(["farmer", "cooperative", "barista", "roaster", "trader", "enterprise", "other"]),
  business_name: z.string().trim().max(150).optional().default(""),
  farm_size: z.string().trim().max(60).optional().default(""),
});

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
