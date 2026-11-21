/**
 * CCAK Coffee Farm Cost Calculator — Pricing & Population Engine
 * All monetary values in KES. Unverified prices stay null → UI shows "PRICE SUBJECT TO CONFIRMATION".
 */

export type Terrain =
  | "flat"
  | "gently_sloping"
  | "moderately_steep"
  | "very_steep"
  | "extremely_steep";

export type FarmShape = "square" | "rectangular" | "irregular" | "terraced";

export interface Variety {
  id: string;
  code: string;
  name: string;
  row_spacing_m: number;
  tree_spacing_m: number;
  planting_density_per_acre?: number | null;
  seedling_unit_price_kes: number | null;
  characteristics?: string | null;
}

export interface ServiceRow {
  id: string;
  code: string;
  name: string;
  unit: string;
  base_unit_price_kes: number | null;
  labour_component_kes: number;
  material_component_kes: number;
  equipment_component_kes: number;
  transport_component_kes: number;
  minimum_charge_kes: number;
  terrain_multiplier_flat: number;
  terrain_multiplier_gentle: number;
  terrain_multiplier_moderate: number;
  terrain_multiplier_steep: number;
  terrain_multiplier_extreme: number;
  is_package: boolean;
  package_includes: string[] | null;
  verification_status: string;
  category_slug?: string;
}

export interface SelectedLine {
  service: ServiceRow;
  quantity: number;
  /** override unit price if user/admin sets one */
  unitPriceOverride?: number | null;
}

export interface PopulationResult {
  theoreticalTrees: number;
  plantableAreaAcres: number;
  seedlingsNeeded: number;
  replacementSeedlings: number;
  actualPlantingPopulation: number;
  isPreliminary: boolean;
  landUtilisationFactor: number;
  densityPerAcre: number;
  notes: string[];
}

export interface CostBreakdown {
  lines: Array<{
    code: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number | null;
    lineTotal: number | null;
    confirmed: boolean;
    components: {
      labour: number;
      materials: number;
      equipment: number;
      transport: number;
    };
  }>;
  seedlingsCost: number | null;
  labourTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  transportTotal: number;
  consultancyTotal: number;
  subtotal: number | null;
  tax: number;
  grandTotal: number | null;
  costPerAcre: number | null;
  hasUnconfirmedPrices: boolean;
}

const TERRAIN_KEY: Record<Terrain, keyof ServiceRow> = {
  flat: "terrain_multiplier_flat",
  gently_sloping: "terrain_multiplier_gentle",
  moderately_steep: "terrain_multiplier_moderate",
  very_steep: "terrain_multiplier_steep",
  extremely_steep: "terrain_multiplier_extreme",
};

/** Default land utilisation when shape/terrain reduce plantable area */
export function defaultUtilisation(shape: FarmShape, terrain: Terrain): number {
  if (shape === "irregular" || terrain === "very_steep" || terrain === "extremely_steep") return 0.75;
  if (shape === "terraced" || terrain === "moderately_steep") return 0.85;
  if (terrain === "gently_sloping") return 0.92;
  return 0.95; // roads, paths, infrastructure residual
}

export function calculatePopulation(params: {
  acres: number;
  variety: Variety;
  shape: FarmShape;
  terrain: Terrain;
  landUtilisationFactor?: number;
  replacementPercent?: number; // 5–10
}): PopulationResult {
  const {
    acres,
    variety,
    shape,
    terrain,
    landUtilisationFactor = defaultUtilisation(shape, terrain),
    replacementPercent = 8,
  } = params;

  const density =
    variety.planting_density_per_acre ||
    Math.round(4046.86 / (variety.row_spacing_m * variety.tree_spacing_m));

  const plantableAreaAcres = +(acres * landUtilisationFactor).toFixed(3);
  const theoreticalTrees = Math.round(acres * density);
  const actualPlantingPopulation = Math.round(plantableAreaAcres * density);
  const replacementSeedlings = Math.ceil(actualPlantingPopulation * (replacementPercent / 100));
  const seedlingsNeeded = actualPlantingPopulation + replacementSeedlings;

  const isPreliminary =
    shape === "irregular" ||
    terrain === "very_steep" ||
    terrain === "extremely_steep" ||
    landUtilisationFactor < 0.9;

  const notes: string[] = [];
  if (isPreliminary) {
    notes.push(
      "Result is PRELIMINARY until a field survey confirms plantable area, roads and infrastructure."
    );
  }
  notes.push(
    `Density ≈ ${density} trees/acre at ${variety.row_spacing_m}m × ${variety.tree_spacing_m}m.`
  );

  return {
    theoreticalTrees,
    plantableAreaAcres,
    seedlingsNeeded,
    replacementSeedlings,
    actualPlantingPopulation,
    isPreliminary,
    landUtilisationFactor,
    densityPerAcre: density,
    notes,
  };
}

function terrainMultiplier(service: ServiceRow, terrain: Terrain): number {
  const key = TERRAIN_KEY[terrain];
  const m = service[key];
  return typeof m === "number" ? m : 1;
}

/**
 * Prevent double-charging: if a package is selected, drop included service codes.
 */
export function dedupePackageLines(selected: SelectedLine[]): SelectedLine[] {
  const packageCodes = new Set<string>();
  selected.forEach((l) => {
    if (l.service.is_package && l.service.package_includes?.length) {
      l.service.package_includes.forEach((c) => packageCodes.add(c));
    }
  });
  return selected.filter(
    (l) => l.service.is_package || !packageCodes.has(l.service.code)
  );
}

export function calculateCosts(params: {
  selected: SelectedLine[];
  terrain: Terrain;
  acres: number;
  trees: number;
  seedlingUnitPrice: number | null;
  seedlingQty: number;
  taxRate?: number; // e.g. 0.16 if applicable — default 0 until admin sets
}): CostBreakdown {
  const lines = dedupePackageLines(params.selected);
  const taxRate = params.taxRate ?? 0;

  let labourTotal = 0;
  let materialsTotal = 0;
  let equipmentTotal = 0;
  let transportTotal = 0;
  let consultancyTotal = 0;
  let running = 0;
  let hasUnconfirmed = false;
  let allPriced = true;

  const outLines: CostBreakdown["lines"] = [];

  for (const line of lines) {
    const s = line.service;
    const mult = terrainMultiplier(s, params.terrain);
    const base =
      line.unitPriceOverride != null
        ? line.unitPriceOverride
        : s.base_unit_price_kes;

    const confirmed = s.verification_status === "verified" && base != null;
    if (base == null) {
      hasUnconfirmed = true;
      allPriced = false;
    }

    const unitPrice = base != null ? +(base * mult).toFixed(2) : null;
    let lineTotal: number | null =
      unitPrice != null ? +(unitPrice * line.quantity).toFixed(2) : null;

    if (lineTotal != null && s.minimum_charge_kes > 0) {
      lineTotal = Math.max(lineTotal, s.minimum_charge_kes);
    }

    const labour = (s.labour_component_kes || 0) * line.quantity * mult;
    const materials = (s.material_component_kes || 0) * line.quantity;
    const equipment = (s.equipment_component_kes || 0) * line.quantity;
    const transport = (s.transport_component_kes || 0) * line.quantity;

    labourTotal += labour;
    materialsTotal += materials;
    equipmentTotal += equipment;
    transportTotal += transport;
    if (s.code.startsWith("CONS_")) consultancyTotal += lineTotal ?? 0;
    if (lineTotal != null) running += lineTotal;

    outLines.push({
      code: s.code,
      name: s.name,
      quantity: line.quantity,
      unit: s.unit,
      unitPrice,
      lineTotal,
      confirmed,
      components: { labour, materials, equipment, transport },
    });
  }

  // Seedlings line
  let seedlingsCost: number | null = null;
  if (params.seedlingQty > 0) {
    if (params.seedlingUnitPrice != null) {
      seedlingsCost = +(params.seedlingUnitPrice * params.seedlingQty).toFixed(2);
      running += seedlingsCost;
      materialsTotal += seedlingsCost;
    } else {
      hasUnconfirmed = true;
      allPriced = false;
    }
  }

  const subtotal = allPriced ? +running.toFixed(2) : null;
  const tax = subtotal != null ? +(subtotal * taxRate).toFixed(2) : 0;
  const grandTotal = subtotal != null ? +(subtotal + tax).toFixed(2) : null;
  const costPerAcre =
    grandTotal != null && params.acres > 0
      ? +(grandTotal / params.acres).toFixed(2)
      : null;

  return {
    lines: outLines,
    seedlingsCost,
    labourTotal: +labourTotal.toFixed(2),
    materialsTotal: +materialsTotal.toFixed(2),
    equipmentTotal: +equipmentTotal.toFixed(2),
    transportTotal: +transportTotal.toFixed(2),
    consultancyTotal: +consultancyTotal.toFixed(2),
    subtotal,
    tax,
    grandTotal,
    costPerAcre,
    hasUnconfirmedPrices: hasUnconfirmed,
  };
}

export function formatKes(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "PRICE SUBJECT TO CONFIRMATION";
  return `KES ${value.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
