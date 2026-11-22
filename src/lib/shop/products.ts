export interface ShopProduct {
  id: "nyeri-aa" | "kirinyaga-pb" | "ccak-tote" | "export-course";
  tag: string;
  name: string;
  price: number;
  physical: boolean;
  quantity_description: string;
  unit_weight_grams: number | null;
}

/** Canonical listing data: unit quantity and delivery weight are required together. */
export const PRODUCTS = [
  { id: "nyeri-aa", tag: "Nyeri AA", name: "Nyeri AA whole bean, 250g", price: 950, physical: true, quantity_description: "1 coffee pack · 250 g", unit_weight_grams: 250 },
  { id: "kirinyaga-pb", tag: "Kirinyaga PB", name: "Kirinyaga peaberry, ground, 250g", price: 1050, physical: true, quantity_description: "1 coffee pack · 250 g", unit_weight_grams: 250 },
  { id: "ccak-tote", tag: "Merchandise", name: "CCAK founding-member tote", price: 650, physical: true, quantity_description: "1 tote bag · 100 g", unit_weight_grams: 100 },
  { id: "export-course", tag: "Academy", name: "Export readiness course access", price: 2500, physical: false, quantity_description: "1 digital course access", unit_weight_grams: null },
] as const satisfies readonly ShopProduct[];