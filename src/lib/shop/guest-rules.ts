import { z } from "zod";
import { checkoutSchema } from "./catalog";
export const guestCheckoutSchema = checkoutSchema.extend({ customer_name: z.string().trim().min(2).max(120), customer_email: z.string().trim().email().max(255) });
export async function guestSessionHash(token: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), (n) => n.toString(16).padStart(2, "0")).join("");
}
export function newGuestToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, "0")).join(""); }
export function validGuestToken(token: string | undefined): token is string { return Boolean(token && /^[a-f0-9]{64}$/.test(token)); }