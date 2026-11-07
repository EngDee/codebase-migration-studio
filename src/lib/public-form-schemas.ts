import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  company_website: z.string().max(0, "Unable to submit this form").default(""),
});

export const publicInquirySchema = newsletterSchema.extend({
  kind: z.enum(["partner", "donate"]),
  full_name: z.string().trim().min(1, "Enter your full name").max(120),
  phone: z.string().trim().max(20).default(""),
  county: z.string().trim().max(40).default(""),
  message: z.string().trim().max(1000).default(""),
});