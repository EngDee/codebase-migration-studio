import { z } from "zod";

export const accountSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  full_name: z.string().trim().max(120).optional(),
});

export function confirmationUrl(origin: string) {
  return new URL("/auth", origin).href;
}

export function isPasswordRecovery(hash: string) {
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
}