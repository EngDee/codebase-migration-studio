import { describe, expect, it } from "vitest";
import { calculateCosts, calculatePopulation, defaultUtilisation, dedupePackageLines, formatKes, type ServiceRow } from "./engine";

const sl28 = { id: "v", code: "SL28", name: "SL28", row_spacing_m: 2.74, tree_spacing_m: 2.74, seedling_unit_price_kes: null };
const svc = (o: Partial<ServiceRow>): ServiceRow => ({
  id: o.code ?? "s", code: "X", name: "X", unit: "acre", base_unit_price_kes: null,
  labour_component_kes: 0, material_component_kes: 0, equipment_component_kes: 0, transport_component_kes: 0, minimum_charge_kes: 0,
  terrain_multiplier_flat: 1, terrain_multiplier_gentle: 1.05, terrain_multiplier_moderate: 1.15, terrain_multiplier_steep: 1.3, terrain_multiplier_extreme: 1.5,
  is_package: false, package_includes: null, verification_status: "subject_to_confirmation", ...o,
});

describe("coffee calculator", () => {
  it("SL28 at 2.74m x 2.74m gives 539 trees per acre", () => {
    const r = calculatePopulation({ acres: 1, variety: sl28, shape: "square", terrain: "flat" });
    expect(r.densityPerAcre).toBe(539);
  });
  it("adds 8% replacement seedlings by default", () => {
    const r = calculatePopulation({ acres: 1, variety: sl28, shape: "square", terrain: "flat", landUtilisationFactor: 1 });
    expect(r.replacementSeedlings).toBe(44);
    expect(r.seedlingsNeeded).toBe(583);
  });
  it("irregular or very steep farms use 0.75 utilisation and are preliminary", () => {
    expect(defaultUtilisation("irregular", "flat")).toBe(0.75);
    expect(calculatePopulation({ acres: 1, variety: sl28, shape: "square", terrain: "very_steep" }).isPreliminary).toBe(true);
  });
  it("unpriced services show PRICE SUBJECT TO CONFIRMATION and no grand total", () => {
    const c = calculateCosts({ selected: [{ service: svc({}), quantity: 2 }], terrain: "flat", acres: 2, trees: 0, seedlingUnitPrice: null, seedlingQty: 0 });
    expect(c.grandTotal).toBeNull();
    expect(formatKes(c.grandTotal)).toBe("PRICE SUBJECT TO CONFIRMATION");
  });
  it("very steep terrain multiplies price by 1.30", () => {
    const c = calculateCosts({ selected: [{ service: svc({ base_unit_price_kes: 1000 }), quantity: 1 }], terrain: "very_steep", acres: 1, trees: 0, seedlingUnitPrice: null, seedlingQty: 0 });
    expect(c.grandTotal).toBe(1300);
  });
  it("a package removes the services it already includes", () => {
    const lines = dedupePackageLines([
      { service: svc({ code: "LAYOUT_BASIC", is_package: true, package_includes: ["LAYOUT_MARK"] }), quantity: 1 },
      { service: svc({ code: "LAYOUT_MARK" }), quantity: 1 },
    ]);
    expect(lines.map((l) => l.service.code)).toEqual(["LAYOUT_BASIC"]);
  });
});
