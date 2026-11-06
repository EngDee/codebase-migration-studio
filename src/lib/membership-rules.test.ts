import { describe, expect, it } from "vitest";
import { applicationSchema, COUNTIES, reviewSchema, hasStaffRole } from "./members";

const application = { full_name: "David Muigai", phone: "+254703424972", county: "Nyeri", member_type: "farmer", terms_accepted: true };

describe("Membership submission rules", () => {
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