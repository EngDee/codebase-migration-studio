import { z } from "zod";

export const MIN_DONATION_KES = 100;
export const MAX_DONATION_KES = 250000;

export const donationSchema = z.object({
  amount_kes: z.coerce.number().int("Enter a whole amount in KES.")
    .min(MIN_DONATION_KES, `The minimum donation is KES ${MIN_DONATION_KES}.`)
    .max(MAX_DONATION_KES, `The maximum M-Pesa donation is KES ${MAX_DONATION_KES.toLocaleString()}.`),
  phone: z.string().trim().min(9, "Enter your M-Pesa number.").max(20),
  donor_name: z.string().trim().max(120).optional().transform((v) => (v && v.length >= 2 ? v : undefined)),
});
