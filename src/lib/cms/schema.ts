import { z } from "zod";

export const modules = ["site_notices", "leadership_profiles", "site_programs", "shop_products", "site_documents", "site_gallery", "site_settings"] as const;
export type CmsModule = typeof modules[number];
export const moduleSchema = z.enum(modules);
const text = z.string().trim().max(10000).default("");
const link = z.string().trim().max(2000).default("").refine((v) => !v || /^https:\/\//.test(v) || /^\/(?!\/)/.test(v) || /^#[a-z]/i.test(v), "Use an HTTPS address or a website link.");
export const detailsSchemas = {
  site_notices: z.object({ message: text, priority: z.enum(["info", "warning", "urgent"]).default("info"), action_label: text, action_url: link }),
  leadership_profiles: z.object({ constitutional_title: text, role_category: z.enum(["national_executive", "national_board", "county_director", "patron"]).default("national_executive"), biography: text, image_url: link, email: z.union([z.literal(""), z.string().email()]).default(""), phone: text }),
  site_programs: z.object({ code: text, tagline: text, summary: text, image_url: link, status: z.enum(["active", "upcoming", "completed"]).default("active"), is_featured: z.boolean().default(false) }),
  shop_products: z.object({ tag: text, price_kes: z.number().int().positive().max(10000000), is_physical: z.boolean(), quantity_description: z.string().trim().min(2).max(200), unit_weight_grams: z.number().finite().positive().max(1000000).nullable(), image_url: link, stock_status: z.enum(["in_stock", "low_stock", "out_of_stock"]).default("in_stock") }).refine((v) => !v.is_physical || v.unit_weight_grams !== null, { path: ["unit_weight_grams"], message: "Enter the weight in grams for a physical item." }),
  site_documents: z.object({ description: text, category: z.enum(["constitution", "agronomy", "market_report", "policy_brief", "annual_report", "other"]).default("other"), file_path: z.string().trim().min(1).max(1000), filename: text, access_level: z.enum(["public", "members_only"]).default("public"), publication_date: text }),
  site_gallery: z.object({ caption: text, album_name: text, image_url: z.string().url().startsWith("https://"), is_homepage_featured: z.boolean().default(true) }),
  site_settings: z.object({ primary_phone: text, secondary_phone: text, whatsapp_number: text, support_email: z.union([z.literal(""), z.string().email()]).default(""), office_address: text, postal_box: text, facebook: link, instagram: link, x: link, tiktok: link, linkedin: link, youtube: link, hero_headline: text, hero_subheadline: text, hero_image_url: link, mission: text, vision: text }),
};
export const recordSchema = z.object({ module: moduleSchema, id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(), title: z.string().trim().min(2).max(200), is_active: z.boolean(), display_order: z.number().int().min(0).max(10000), starts_at: z.string().datetime().nullable().default(null), expires_at: z.string().datetime().nullable().default(null), details: z.record(z.string(), z.unknown()), updated_at: z.string().optional() }).superRefine((v, ctx) => { if (v.starts_at && v.expires_at && v.expires_at <= v.starts_at) ctx.addIssue({ code: "custom", path: ["expires_at"], message: "The end must be after the start." }); });
export interface CmsRecord { id: string; title: string; is_active: boolean; display_order: number; starts_at: string | null; expires_at: string | null; details: Record<string, unknown>; updated_at: string }
export type CmsContent = Record<CmsModule, CmsRecord[]>;
export function visibleNow(record: Pick<CmsRecord, "is_active" | "starts_at" | "expires_at">, now = new Date()) { return record.is_active && (!record.starts_at || new Date(record.starts_at) <= now) && (!record.expires_at || new Date(record.expires_at) > now); }
export const stringDetail = (record: CmsRecord | undefined, key: string) => typeof record?.details[key] === "string" ? String(record.details[key]) : "";