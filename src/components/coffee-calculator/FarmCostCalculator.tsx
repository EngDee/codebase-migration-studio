import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  calculatePopulation,
  calculateCosts,
  formatKes,
  defaultUtilisation,
  type Terrain,
  type FarmShape,
  type Variety,
  type ServiceRow,
  type SelectedLine,
} from "@/lib/coffee-calculator/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEPS = [
  "Farm information",
  "Coffee variety",
  "Tree population",
  "Services",
  "Seedlings & inputs",
  "Review costs",
  "Quotation",
];

const COUNTIES = [
  "Kiambu", "Murang'a", "Nyeri", "Kirinyaga", "Embu", "Meru", "Tharaka-Nithi",
  "Machakos", "Makueni", "Kitui", "Bungoma", "Kakamega", "Trans Nzoia",
  "Uasin Gishu", "Nandi", "Kericho", "Bomet", "Nyamira", "Kisii", "Other",
];

const TERRAINS: { value: Terrain; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "gently_sloping", label: "Gently sloping" },
  { value: "moderately_steep", label: "Moderately steep" },
  { value: "very_steep", label: "Very steep" },
  { value: "extremely_steep", label: "Extremely steep" },
];

const SHAPES: { value: FarmShape; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "rectangular", label: "Rectangular" },
  { value: "irregular", label: "Irregular" },
  { value: "terraced", label: "Terraced" },
];

type FarmerForm = {
  fullName: string;
  phone: string;
  county: string;
  subcounty: string;
  farmLocation: string;
  farmSizeAcres: number;
  areaUnderCoffee: number;
  existingTrees: number;
  experienceYears: number;
  establishmentStatus: string;
  terrain: Terrain;
  farmShape: FarmShape;
  water: string[];
  landUtilisation: number;
};

const emptyFarmer: FarmerForm = {
  fullName: "",
  phone: "",
  county: "",
  subcounty: "",
  farmLocation: "",
  farmSizeAcres: 1,
  areaUnderCoffee: 1,
  existingTrees: 0,
  experienceYears: 0,
  establishmentStatus: "new",
  terrain: "gently_sloping",
  farmShape: "rectangular",
  water: ["rain-fed"],
  landUtilisation: 0.85,
};

export function FarmCostCalculator() {
  const [step, setStep] = useState(0);
  const [farmer, setFarmer] = useState<FarmerForm>(emptyFarmer);
  const [selectedVarietyIds, setSelectedVarietyIds] = useState<string[]>([]);
  const [primaryVarietyId, setPrimaryVarietyId] = useState<string>("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [serviceQty, setServiceQty] = useState<Record<string, number>>({});
  const [includeSeedlings, setIncludeSeedlings] = useState(true);
  const [replacementPct, setReplacementPct] = useState(8);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const toast = { error: (text: string) => setNotice({ ok: false, text }), success: (text: string) => setNotice({ ok: true, text }) };
  const [quotationNumber, setQuotationNumber] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: varieties = [] } = useQuery({
    queryKey: ["coffee_varieties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_varieties")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Variety[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["service_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as { id: string; slug: string; name: string }[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["coffee_services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_services")
        .select("*, service_categories(slug)")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((s) => ({
        ...s,
        category_slug: s.service_categories?.slug,
        labour_component_kes: s.labour_component_kes ?? 0,
        material_component_kes: s.material_component_kes ?? 0,
        equipment_component_kes: s.equipment_component_kes ?? 0,
        transport_component_kes: s.transport_component_kes ?? 0,
        minimum_charge_kes: s.minimum_charge_kes ?? 0,
        terrain_multiplier_flat: s.terrain_multiplier_flat ?? 1,
        terrain_multiplier_gentle: s.terrain_multiplier_gentle ?? 1.05,
        terrain_multiplier_moderate: s.terrain_multiplier_moderate ?? 1.15,
        terrain_multiplier_steep: s.terrain_multiplier_steep ?? 1.3,
        terrain_multiplier_extreme: s.terrain_multiplier_extreme ?? 1.5,
        package_includes: s.package_includes ?? null,
      })) as ServiceRow[];
    },
  });

  const primaryVariety = varieties.find((v) => v.id === primaryVarietyId) || varieties[0];

  const population = useMemo(() => {
    if (!primaryVariety) return null;
    return calculatePopulation({
      acres: farmer.areaUnderCoffee || farmer.farmSizeAcres,
      variety: primaryVariety,
      shape: farmer.farmShape,
      terrain: farmer.terrain,
      landUtilisationFactor: farmer.landUtilisation,
      replacementPercent: replacementPct,
    });
  }, [primaryVariety, farmer, replacementPct]);

  const selectedLines: SelectedLine[] = useMemo(() => {
    return services
      .filter((s) => selectedServiceIds.has(s.id))
      .map((s) => {
        let qty = serviceQty[s.id] ?? 1;
        if (s.unit === "acre") qty = serviceQty[s.id] ?? (farmer.areaUnderCoffee || farmer.farmSizeAcres);
        if (s.unit === "tree" || s.unit === "hole")
          qty = serviceQty[s.id] ?? (population?.actualPlantingPopulation || 1);
        return { service: s, quantity: qty };
      });
  }, [services, selectedServiceIds, serviceQty, farmer, population]);

  const costs = useMemo(() => {
    if (!population) return null;
    return calculateCosts({
      selected: selectedLines,
      terrain: farmer.terrain,
      acres: farmer.areaUnderCoffee || farmer.farmSizeAcres,
      trees: population.actualPlantingPopulation,
      seedlingUnitPrice: includeSeedlings ? primaryVariety?.seedling_unit_price_kes ?? null : null,
      seedlingQty: includeSeedlings ? population.seedlingsNeeded : 0,
      taxRate: 0,
    });
  }, [selectedLines, farmer, population, includeSeedlings, primaryVariety]);

  function updateFarmer<K extends keyof FarmerForm>(key: K, value: FarmerForm[K]) {
    setFarmer((f) => {
      const next = { ...f, [key]: value };
      if (key === "farmShape" || key === "terrain") {
        next.landUtilisation = defaultUtilisation(
          key === "farmShape" ? (value as FarmShape) : f.farmShape,
          key === "terrain" ? (value as Terrain) : f.terrain
        );
      }
      return next;
    });
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function saveQuotation() {
    if (!farmer.fullName || !population || !costs) {
      toast.error("Please complete farm information and calculations first.");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const { data, error } = await supabase.rpc("save_farm_quotation", {
        payload: {
          farmer_full_name: farmer.fullName,
          phone: farmer.phone,
          county: farmer.county,
          subcounty: farmer.subcounty,
          farm_location: farmer.farmLocation,
          farm_size_acres: farmer.farmSizeAcres,
          area_under_coffee_acres: farmer.areaUnderCoffee,
          existing_trees: farmer.existingTrees,
          experience_years: farmer.experienceYears,
          establishment_status: farmer.establishmentStatus,
          terrain: farmer.terrain,
          farm_shape: farmer.farmShape,
          water: farmer.water,
          land_utilisation_factor: farmer.landUtilisation,
          variety_ids: selectedVarietyIds.length ? selectedVarietyIds : primaryVariety ? [primaryVariety.id] : [],
          primary_variety_id: primaryVariety?.id ?? null,
          theoretical_trees: population.theoreticalTrees,
          plantable_area_acres: population.plantableAreaAcres,
          seedlings_needed: population.seedlingsNeeded,
          replacement_seedlings: population.replacementSeedlings,
          actual_planting_population: population.actualPlantingPopulation,
          population: { ...population },
          include_seedlings: includeSeedlings,
          assumptions: population.notes.join(" "),
          items: selectedLines.map((l) => ({ service_id: l.service.id, quantity: l.quantity })),
        },
      });
      if (error) throw error;
      const result = data as { quotation_number: string } | null;
      if (!result?.quotation_number) throw new Error("The quotation could not be confirmed. Please try again.");
      setQuotationNumber(result.quotation_number);
      setStep(6);
      toast.success("Quotation saved. A CCAK agronomist will confirm field rates.");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Could not save quotation. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[var(--cream)] py-8 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--forest)]">
            CCAK · Farm Services
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--coffee-deep)]">
            Kenya Coffee Farm Services & Cost Estimator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step-by-step cost estimate per acre and for your whole farm. Prices marked
            “subject to confirmation” must be verified by CCAK / local suppliers.
          </p>
        </div>

        <Progress value={progress} className="h-2 mb-2" />
        <p className="text-xs text-muted-foreground mb-6">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <Card className="border-[var(--coffee)]/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[var(--coffee-deep)]">{STEPS[step]}</CardTitle>
              <CardDescription>Fill in what you know. You can go back anytime.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 0 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Farmer full name *</Label>
                    <Input value={farmer.fullName} onChange={(e) => updateFarmer("fullName", e.target.value)} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={farmer.phone} onChange={(e) => updateFarmer("phone", e.target.value)} />
                  </div>
                  <div>
                    <Label>County</Label>
                    <Select value={farmer.county} onValueChange={(v) => updateFarmer("county", v)}>
                      <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                      <SelectContent>
                        {COUNTIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sub-county</Label>
                    <Input value={farmer.subcounty} onChange={(e) => updateFarmer("subcounty", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Farm location</Label>
                    <Input value={farmer.farmLocation} onChange={(e) => updateFarmer("farmLocation", e.target.value)} />
                  </div>
                  <div>
                    <Label>Farm size (acres) *</Label>
                    <Input type="number" min={0.1} step={0.1} value={farmer.farmSizeAcres}
                      onChange={(e) => updateFarmer("farmSizeAcres", +e.target.value)} />
                  </div>
                  <div>
                    <Label>Area under coffee (acres)</Label>
                    <Input type="number" min={0} step={0.1} value={farmer.areaUnderCoffee}
                      onChange={(e) => updateFarmer("areaUnderCoffee", +e.target.value)} />
                  </div>
                  <div>
                    <Label>Existing coffee trees</Label>
                    <Input type="number" min={0} value={farmer.existingTrees}
                      onChange={(e) => updateFarmer("existingTrees", +e.target.value)} />
                  </div>
                  <div>
                    <Label>Experience (years)</Label>
                    <Input type="number" min={0} step={0.5} value={farmer.experienceYears}
                      onChange={(e) => updateFarmer("experienceYears", +e.target.value)} />
                  </div>
                  <div>
                    <Label>Establishment status</Label>
                    <Select value={farmer.establishmentStatus}
                      onValueChange={(v) => updateFarmer("establishmentStatus", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New farm</SelectItem>
                        <SelectItem value="productive">Existing productive farm</SelectItem>
                        <SelectItem value="rehabilitation">Old farm requiring rehabilitation</SelectItem>
                        <SelectItem value="renovation">Complete renovation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Terrain</Label>
                    <Select value={farmer.terrain} onValueChange={(v) => updateFarmer("terrain", v as Terrain)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TERRAINS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Farm shape</Label>
                    <Select value={farmer.farmShape} onValueChange={(v) => updateFarmer("farmShape", v as FarmShape)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SHAPES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Land utilisation factor</Label>
                    <Input type="number" min={0.5} max={1} step={0.01} value={farmer.landUtilisation}
                      onChange={(e) => updateFarmer("landUtilisation", +e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-set from terrain/shape; adjust after survey.
                    </p>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Select one or more varieties. Primary variety drives density.</p>
                  {varieties.map((v) => (
                    <label key={v.id} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-white">
                      <Checkbox
                        checked={selectedVarietyIds.includes(v.id)}
                        onCheckedChange={(c) => {
                          if (!c && primaryVarietyId === v.id) setPrimaryVarietyId("");
                          setSelectedVarietyIds((ids) =>
                            c ? [...ids, v.id] : ids.filter((x) => x !== v.id)
                          );
                          if (c && !primaryVarietyId) setPrimaryVarietyId(v.id);
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{v.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Spacing {v.row_spacing_m}m × {v.tree_spacing_m}m · ~
                          {v.planting_density_per_acre ??
                            Math.round(4046.86 / (v.row_spacing_m * v.tree_spacing_m))}{" "}
                          trees/acre
                        </div>
                        {v.characteristics && <p className="text-xs mt-1">{v.characteristics}</p>}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={primaryVarietyId === v.id ? "default" : "outline"}
                        onClick={() => setPrimaryVarietyId(v.id)}
                      >
                        Primary
                      </Button>
                    </label>
                  ))}
                </div>
              )}

              {step === 2 && population && primaryVariety && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Stat label="Density / acre" value={`${population.densityPerAcre}`} />
                    <Stat label="Plantable area" value={`${population.plantableAreaAcres} ac`} />
                    <Stat label="Theoretical trees" value={population.theoreticalTrees.toLocaleString()} />
                    <Stat label="Actual planting pop." value={population.actualPlantingPopulation.toLocaleString()} />
                    <Stat label="Replacement %" value={`${replacementPct}%`} />
                    <Stat label="Total seedlings" value={population.seedlingsNeeded.toLocaleString()} />
                  </div>
                  <div>
                    <Label>Replacement seedlings (%)</Label>
                    <Input type="number" min={5} max={15} value={replacementPct}
                      onChange={(e) => setReplacementPct(+e.target.value)} />
                  </div>
                  {population.isPreliminary && (
                    <Badge variant="outline" className="border-amber-600 text-amber-800">
                      Preliminary — field survey recommended
                    </Badge>
                  )}
                  <ul className="text-sm list-disc pl-5 text-muted-foreground">
                    {population.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const catServices = services.filter((s) => s.category_slug === cat.slug);
                    if (!catServices.length) return null;
                    return (
                      <div key={cat.id}>
                        <h3 className="font-semibold text-[var(--forest)] mb-2">{cat.name}</h3>
                        <div className="space-y-2">
                          {catServices.map((s) => (
                            <label key={s.id} className="flex items-center gap-3 rounded border p-2 text-sm">
                              <Checkbox
                                checked={selectedServiceIds.has(s.id)}
                                onCheckedChange={() => toggleService(s.id)}
                              />
                              <span className="flex-1">{s.name}</span>
                              <span className="text-xs text-muted-foreground">{s.unit}</span>
                              <span className="text-xs font-medium w-28 text-right">
                                {formatKes(s.base_unit_price_kes)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {step === 4 && population && (
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <Checkbox checked={includeSeedlings} onCheckedChange={(c) => setIncludeSeedlings(!!c)} />
                    Include seedlings in quotation
                  </label>
                  {includeSeedlings && (
                    <div className="rounded-md bg-white border p-4 space-y-2">
                      <p>
                        <strong>{population.seedlingsNeeded.toLocaleString()}</strong> seedlings
                        ({primaryVariety?.name}) including {replacementPct}% replacement
                      </p>
                      <p className="text-sm">
                        Unit price: {formatKes(primaryVariety?.seedling_unit_price_kes ?? null)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Admin / nursery must set verified seedling prices per variety and supplier.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === 5 && costs && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2">Item</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th className="text-right">Unit price</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costs.lines.map((l) => (
                          <tr key={l.code} className="border-b border-dashed">
                            <td className="py-2">{l.name}</td>
                            <td>{l.quantity}</td>
                            <td>{l.unit}</td>
                            <td className="text-right">{formatKes(l.unitPrice)}</td>
                            <td className="text-right">{formatKes(l.lineTotal)}</td>
                          </tr>
                        ))}
                        {includeSeedlings && (
                          <tr className="border-b">
                            <td className="py-2">Seedlings</td>
                            <td>{population?.seedlingsNeeded}</td>
                            <td>seedling</td>
                            <td className="text-right">{formatKes(primaryVariety?.seedling_unit_price_kes ?? null)}</td>
                            <td className="text-right">{formatKes(costs.seedlingsCost)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {costs.hasUnconfirmedPrices && (
                    <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded p-3">
                      Some lines are <strong>PRICE SUBJECT TO CONFIRMATION</strong>. Grand total is only
                      shown when all selected prices are set and verified.
                    </p>
                  )}
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  {quotationNumber ? (
                    <>
                      <p className="text-lg font-semibold">Quotation {quotationNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Saved for {farmer.fullName}. Valid for field verification. You can request inspection
                        or book services from the CCAK team.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={() => window.print()}>Print</Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const text = encodeURIComponent(
                              `CCAK Quotation ${quotationNumber} for ${farmer.fullName}, ${farmer.farmSizeAcres} acres, ${primaryVariety?.name ?? ""}. Please confirm field rates.`
                            );
                            window.open(`https://wa.me/?text=${text}`, "_blank");
                          }}
                        >
                          Share on WhatsApp
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p>Generate and save your quotation from the Review step.</p>
                  )}
                </div>
              )}

              {notice && (
                <p role="status" className={`text-sm rounded border p-3 ${notice.ok ? "border-[var(--forest)] text-[var(--forest-deep)] bg-white" : "border-destructive text-destructive bg-white"}`}>
                  {notice.text}
                </p>
              )}
              <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
                {step < 5 && (
                  <Button
                    type="button"
                    className="bg-[var(--forest)] hover:bg-[var(--forest-deep)]"
                    onClick={() => setStep((s) => s + 1)}
                    disabled={step === 0 && !farmer.fullName}
                  >
                    Continue
                  </Button>
                )}
                {step === 5 && (
                  <Button
                    type="button"
                    className="bg-[var(--gold)] text-[var(--coffee-deep)]"
                    disabled={saving}
                    onClick={saveQuotation}
                  >
                    {saving ? "Saving…" : "Generate quotation"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Live summary */}
          <div className="space-y-4 lg:sticky lg:top-4 h-fit">
            <Card className="bg-[var(--coffee-deep)] text-[var(--cream)] border-0">
              <CardHeader>
                <CardTitle className="text-base text-white">Live cost summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <Row label="Farm size" value={`${farmer.farmSizeAcres} ac`} />
                <Row label="Under coffee" value={`${farmer.areaUnderCoffee} ac`} />
                <Row label="Variety" value={primaryVariety?.name ?? "—"} />
                <Row label="Trees (est.)" value={population?.actualPlantingPopulation?.toLocaleString() ?? "—"} />
                <Row label="Seedlings" value={population?.seedlingsNeeded?.toLocaleString() ?? "—"} />
                <hr className="border-white/20" />
                <Row label="Labour" value={formatKes(costs?.labourTotal ?? null)} />
                <Row label="Materials" value={formatKes(costs?.materialsTotal ?? null)} />
                <Row label="Equipment" value={formatKes(costs?.equipmentTotal ?? null)} />
                <Row label="Transport" value={formatKes(costs?.transportTotal ?? null)} />
                <Row label="Cost / acre" value={formatKes(costs?.costPerAcre ?? null)} />
                <div className="pt-2 text-lg font-bold text-[var(--gold-soft)]">
                  Grand total: {formatKes(costs?.grandTotal ?? null)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-[var(--coffee-deep)]">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="opacity-80">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}