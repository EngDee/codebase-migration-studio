import { describe, expect, it } from "vitest";
import { donationSchema } from "./rules";

describe("donation amount", () => {
  it("accepts KES 100", () => expect(donationSchema.safeParse({ amount_kes: 100, phone: "0712345678" }).success).toBe(true));
  it("rejects KES 99", () => expect(donationSchema.safeParse({ amount_kes: 99, phone: "0712345678" }).success).toBe(false));
});
