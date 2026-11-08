import { describe, expect, it } from "vitest";
import { applicationSchema, COUNTIES, reviewSchema, hasStaffRole } from "./members";

const application = { full_name: "David Muigai", phone: "+254703424972", county: "Nyeri", member_type: "farmer", terms_accepted: true, national_id: "12345678", gender: "male", date_of_birth: "1990-01-01" };

describe("Membership submission rules", () => {
  it("accepts CCAK Member as a registration type", () => {
    expect(applicationSchema.safeParse({ ...application, member_type: "ccak_member" }).success).toBe(true);
  });
  it("requires a National ID and preserves leading zeros", () => {
    expect(applicationSchema.safeParse({ ...application, national_id: "" }).success).toBe(false);
    const result = applicationSchema.safeParse({ ...application, national_id: "00123456" });
    expect(result.success && result.data.national_id).toBe("00123456");
    expect(applicationSchema.safeParse({ ...application, national_id: "123abc78" }).success).toBe(false);
  });
  it("requires gender and rejects unlisted gender values", () => {
    expect(applicationSchema.safeParse({ ...application, gender: "" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...application, gender: "unlisted" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...application, gender: "prefer_not_to_say" }).success).toBe(true);
  });
  it("requires a real date of birth in the past", () => {
    expect(applicationSchema.safeParse({ ...application, date_of_birth: "" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...application, date_of_birth: "2026-02-30" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...application, date_of_birth: "2099-01-01" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...application, date_of_birth: "2000-02-29" }).success).toBe(true);
  });
  it("requires explicit membership terms acceptance", () => {
    expect(applicationSchema.safeParse({ ...application, terms_accepted: false }).success).toBe(false);
    expect(applicationSchema.safeParse(application).success).toBe(true);
  });
  it("supports all 47 Kenyan counties and refuses unknown counties", () => {
    expect(COUNTIES).toHaveLength(47);
    expect(applicationSchema.safeParse({ ...application, county: "Unknown" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...application, county: "Nairobi" }).success).toBe(true);
  });
  it("requires a recorded rejection reason", () => {
    const decision = { application_id: "00000000-0000-4000-8000-000000000001", decision: "rejected" };
    expect(reviewSchema.safeParse({ ...decision, notes: " " }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...decision, notes: "Required documents are missing" }).success).toBe(true);
  });
  it("does not give ordinary members staff navigation access", () => {
    expect(hasStaffRole(["member"])).toBe(false);
    for (const role of ["admin", "super_admin", "national_admin", "county_admin"]) expect(hasStaffRole([role])).toBe(true);
  });
});