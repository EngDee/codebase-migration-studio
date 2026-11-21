import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatKes } from "@/lib/coffee-calculator/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Service = {
  id: string;
  code: string;
  name: string;
  unit: string;
  base_unit_price_kes: number | null;
  labour_component_kes: number | null;
  material_component_kes: number | null;
  equipment_component_kes: number | null;
  transport_component_kes: number | null;
  minimum_charge_kes: number | null;
  verification_status: string;
  source_name: string | null;
  source_link: string | null;
  last_verified_at: string | null;
  category_id: string;
  is_active: boolean;
  service_categories?: { name: string; slug: string } | null;
};

type Variety = {
  id: string;
  code: string;
  name: string;
  row_spacing_m: number;
  tree_spacing_m: number;
  seedling_unit_price_kes: number | null;
  is_active: boolean;
};

type LabourRate = {
  id: string;
  task_code: string;
  task_name: string;
  unit: string;
  rate_kes: number | null;
  productivity_note: string | null;
  verification_status: string;
  county: string | null;
  is_active: boolean;
};

type HistoryRow = {
  id: string;
  service_id: string | null;
  variety_id: string | null;
  labour_rate_id: string | null;
  field_name: string;
  old_value: number | null;
  new_value: number | null;
  changed_at: string;
  note: string | null;
  changed_by: string | null;
};

type QuotationRow = {
  id: string;
  quotation_number: string;
  farmer_full_name: string;
  county: string | null;
  farm_size_acres: number | null;
  grand_total_kes: number | null;
  status: string;
  created_at: string;
};

function statusBadge(status: string) {
  if (status === "verified") {
    return <Badge className="bg-[var(--forest)]">Verified</Badge>;
  }
  if (status === "expired") {
    return <Badge variant="destructive">Expired</Badge>;
  }
  return (
    <Badge variant="outline" className="border-amber-600 text-amber-800">
      Subject to confirmation
    </Badge>
  );
}

export function AdminPriceDashboard() {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingVariety, setEditingVariety] = useState<Variety | null>(null);
  const [editingLabour, setEditingLabour] = useState<LabourRate | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const toast = { error: (text: string) => setNotice({ ok: false, text }), success: (text: string) => setNotice({ ok: true, text }) };

  const { data: categories = [] } = useQuery({
    queryKey: ["admin_service_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as { id: string; name: string; slug: string }[];
    },
  });

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["admin_coffee_services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_services")
        .select("*, service_categories(name, slug)")
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const { data: varieties = [] } = useQuery({
    queryKey: ["admin_coffee_varieties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_varieties")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Variety[];
    },
  });

  const { data: labourRates = [] } = useQuery({
    queryKey: ["admin_labour_rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labour_rates")
        .select("*")
        .order("task_name");
      if (error) throw error;
      return data as LabourRate[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["admin_price_history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_change_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as HistoryRow[];
    },
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ["admin_quotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select(
          "id, quotation_number, farmer_full_name, county, farm_size_acres, grand_total_kes, status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as QuotationRow[];
    },
  });

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat =
        categoryFilter === "all" || s.service_categories?.slug === categoryFilter;
      const q = search.trim().toLowerCase();
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [services, categoryFilter, search]);

  const unconfirmedCount = services.filter(
    (s) => s.verification_status !== "verified" || s.base_unit_price_kes == null
  ).length;

  const saveService = useMutation({
    mutationFn: async (payload: {
      id: string;
      base_unit_price_kes: number | null;
      labour_component_kes: number | null;
      material_component_kes: number | null;
      equipment_component_kes: number | null;
      transport_component_kes: number | null;
      minimum_charge_kes: number | null;
      verification_status: string;
      source_name: string;
      source_link: string;
      note: string;
    }) => {
      const { data, error } = await supabase.rpc("update_coffee_service_price", {
        p_service_id: payload.id,
        p_base_unit_price_kes: payload.base_unit_price_kes as number,
        p_labour_component_kes: payload.labour_component_kes ?? 0,
        p_material_component_kes: payload.material_component_kes ?? 0,
        p_equipment_component_kes: payload.equipment_component_kes ?? 0,
        p_transport_component_kes: payload.transport_component_kes ?? 0,
        p_minimum_charge_kes: payload.minimum_charge_kes ?? 0,
        p_verification_status: payload.verification_status,
        ...(payload.source_name ? { p_source_name: payload.source_name } : {}),
        ...(payload.source_link ? { p_source_link: payload.source_link } : {}),
        ...(payload.note ? { p_note: payload.note } : {}),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Service price updated and audited");
      setEditingService(null);
      qc.invalidateQueries({ queryKey: ["admin_coffee_services"] });
      qc.invalidateQueries({ queryKey: ["admin_price_history"] });
      qc.invalidateQueries({ queryKey: ["coffee_services"] });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  const saveVariety = useMutation({
    mutationFn: async (payload: {
      id: string;
      seedling_unit_price_kes: number | null;
      row_spacing_m: number;
      tree_spacing_m: number;
      note: string;
    }) => {
      const { error } = await supabase.rpc("update_variety_seedling_price", {
        p_variety_id: payload.id,
        p_seedling_unit_price_kes: payload.seedling_unit_price_kes as number,
        ...(payload.note ? { p_note: payload.note } : {}),
      });
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("coffee_varieties")
        .update({ row_spacing_m: payload.row_spacing_m, tree_spacing_m: payload.tree_spacing_m, updated_at: new Date().toISOString() })
        .eq("id", payload.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Variety / seedling price updated");
      setEditingVariety(null);
      qc.invalidateQueries({ queryKey: ["admin_coffee_varieties"] });
      qc.invalidateQueries({ queryKey: ["coffee_varieties"] });
      qc.invalidateQueries({ queryKey: ["admin_price_history"] });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  const saveLabour = useMutation({
    mutationFn: async (payload: {
      id: string;
      rate_kes: number | null;
      verification_status: string;
      productivity_note: string;
    }) => {
      const { error } = await supabase.rpc("update_labour_rate", {
        p_rate_id: payload.id,
        p_rate_kes: payload.rate_kes as number,
        p_verification_status: payload.verification_status,
        p_productivity_note: payload.productivity_note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Labour rate updated");
      setEditingLabour(null);
      qc.invalidateQueries({ queryKey: ["admin_labour_rates"] });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--forest)]">
          CCAK Admin
        </p>
        <h1 className="text-2xl font-bold text-[var(--coffee-deep)]">
          Farm services price management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit verified Kenyan rates only. Never publish unverified figures as official
          market prices. Every change is written to the audit log.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Services in catalogue</CardDescription>
            <CardTitle className="text-2xl">{services.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Need price confirmation</CardDescription>
            <CardTitle className="text-2xl text-amber-700">{unconfirmedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recent quotations</CardDescription>
            <CardTitle className="text-2xl">{quotations.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {notice && (
        <p role="status" className={`text-sm rounded border p-3 bg-white ${notice.ok ? "border-[var(--forest)] text-[var(--forest-deep)]" : "border-destructive text-destructive"}`}>{notice.text}</p>
      )}
      <Tabs defaultValue="services">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="varieties">Varieties & seedlings</TabsTrigger>
          <TabsTrigger value="labour">Labour rates</TabsTrigger>
          <TabsTrigger value="history">Price history</TabsTrigger>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
        </TabsList>

        {/* SERVICES */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-48">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label>Search</Label>
              <Input
                placeholder="Name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loadingServices ? (
            <p className="text-sm text-muted-foreground">Loading services…</p>
          ) : (
            <div className="rounded-md border bg-white overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Base price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.code} · {s.service_categories?.name}
                        </div>
                      </TableCell>
                      <TableCell>{s.unit}</TableCell>
                      <TableCell>{formatKes(s.base_unit_price_kes)}</TableCell>
                      <TableCell>{statusBadge(s.verification_status)}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">
                        {s.source_name || "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setEditingService(s)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {editingService && (
            <ServiceEditForm
              service={editingService}
              saving={saveService.isPending}
              onCancel={() => setEditingService(null)}
              onSave={(payload) => saveService.mutate({ id: editingService.id, ...payload })}
            />
          )}
        </TabsContent>

        {/* VARIETIES */}
        <TabsContent value="varieties" className="space-y-4">
          <div className="rounded-md border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variety</TableHead>
                  <TableHead>Spacing (m)</TableHead>
                  <TableHead>Seedling price</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varieties.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.name}</div>
                      <div className="text-xs text-muted-foreground">{v.code}</div>
                    </TableCell>
                    <TableCell>
                      {v.row_spacing_m} × {v.tree_spacing_m}
                    </TableCell>
                    <TableCell>{formatKes(v.seedling_unit_price_kes)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setEditingVariety(v)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {editingVariety && (
            <VarietyEditForm
              variety={editingVariety}
              saving={saveVariety.isPending}
              onCancel={() => setEditingVariety(null)}
              onSave={(payload) => saveVariety.mutate({ id: editingVariety.id, ...payload })}
            />
          )}
        </TabsContent>

        {/* LABOUR */}
        <TabsContent value="labour" className="space-y-4">
          <div className="rounded-md border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labourRates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.task_name}</div>
                      <div className="text-xs text-muted-foreground">{r.task_code}</div>
                    </TableCell>
                    <TableCell>{r.unit}</TableCell>
                    <TableCell>{formatKes(r.rate_kes)}</TableCell>
                    <TableCell>{statusBadge(r.verification_status)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setEditingLabour(r)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {editingLabour && (
            <LabourEditForm
              rate={editingLabour}
              saving={saveLabour.isPending}
              onCancel={() => setEditingLabour(null)}
              onSave={(payload) => saveLabour.mutate({ id: editingLabour.id, ...payload })}
            />
          )}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history">
          <div className="rounded-md border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Old</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No price changes recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(h.changed_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">{h.field_name}</TableCell>
                    <TableCell>{formatKes(h.old_value)}</TableCell>
                    <TableCell>{formatKes(h.new_value)}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {h.note || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* QUOTATIONS */}
        <TabsContent value="quotations">
          <div className="rounded-md border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Acres</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-xs">{q.quotation_number}</TableCell>
                    <TableCell>{q.farmer_full_name}</TableCell>
                    <TableCell>{q.county || "—"}</TableCell>
                    <TableCell>{q.farm_size_acres ?? "—"}</TableCell>
                    <TableCell>{formatKes(q.grand_total_kes)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{q.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(q.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ServiceEditForm({
  service,
  saving,
  onCancel,
  onSave,
}: {
  service: Service;
  saving: boolean;
  onCancel: () => void;
  onSave: (p: {
    base_unit_price_kes: number | null;
    labour_component_kes: number | null;
    material_component_kes: number | null;
    equipment_component_kes: number | null;
    transport_component_kes: number | null;
    minimum_charge_kes: number | null;
    verification_status: string;
    source_name: string;
    source_link: string;
    note: string;
  }) => void;
}) {
  const [base, setBase] = useState(service.base_unit_price_kes?.toString() ?? "");
  const [labour, setLabour] = useState(service.labour_component_kes?.toString() ?? "0");
  const [material, setMaterial] = useState(service.material_component_kes?.toString() ?? "0");
  const [equipment, setEquipment] = useState(service.equipment_component_kes?.toString() ?? "0");
  const [transport, setTransport] = useState(service.transport_component_kes?.toString() ?? "0");
  const [minimum, setMinimum] = useState(service.minimum_charge_kes?.toString() ?? "0");
  const [status, setStatus] = useState(service.verification_status || "subject_to_confirmation");
  const [sourceName, setSourceName] = useState(service.source_name ?? "");
  const [sourceLink, setSourceLink] = useState(service.source_link ?? "");
  const [note, setNote] = useState("");

  return (
    <Card className="border-[var(--forest)]">
      <CardHeader>
        <CardTitle className="text-lg">Edit: {service.name}</CardTitle>
        <CardDescription>
          Unit: {service.unit} · Code: {service.code}. Enter only rates from verified
          quotations, CRI/KALRO/AFA schedules, or supplier invoices.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Base unit price (KES)</Label>
          <Input type="number" min={0} step={1} value={base} onChange={(e) => setBase(e.target.value)} />
        </div>
        <div>
          <Label>Verification status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="subject_to_confirmation">Subject to confirmation</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Labour component</Label>
          <Input type="number" value={labour} onChange={(e) => setLabour(e.target.value)} />
        </div>
        <div>
          <Label>Material component</Label>
          <Input type="number" value={material} onChange={(e) => setMaterial(e.target.value)} />
        </div>
        <div>
          <Label>Equipment component</Label>
          <Input type="number" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
        </div>
        <div>
          <Label>Transport component</Label>
          <Input type="number" value={transport} onChange={(e) => setTransport(e.target.value)} />
        </div>
        <div>
          <Label>Minimum charge</Label>
          <Input type="number" value={minimum} onChange={(e) => setMinimum(e.target.value)} />
        </div>
        <div>
          <Label>Source name</Label>
          <Input
            placeholder="e.g. Local nursery quotation Mar 2026"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Source link (optional)</Label>
          <Input value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Audit note</Label>
          <Textarea
            placeholder="Why this price? Invoice no., county, date collected…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[var(--forest)]"
            disabled={saving}
            onClick={() =>
              onSave({
                base_unit_price_kes: base === "" ? null : Number(base),
                labour_component_kes: labour === "" ? 0 : Number(labour),
                material_component_kes: material === "" ? 0 : Number(material),
                equipment_component_kes: equipment === "" ? 0 : Number(equipment),
                transport_component_kes: transport === "" ? 0 : Number(transport),
                minimum_charge_kes: minimum === "" ? 0 : Number(minimum),
                verification_status: status,
                source_name: sourceName,
                source_link: sourceLink,
                note,
              })
            }
          >
            {saving ? "Saving…" : "Save price"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VarietyEditForm({
  variety,
  saving,
  onCancel,
  onSave,
}: {
  variety: Variety;
  saving: boolean;
  onCancel: () => void;
  onSave: (p: {
    seedling_unit_price_kes: number | null;
    row_spacing_m: number;
    tree_spacing_m: number;
    note: string;
  }) => void;
}) {
  const [price, setPrice] = useState(variety.seedling_unit_price_kes?.toString() ?? "");
  const [row, setRow] = useState(String(variety.row_spacing_m));
  const [tree, setTree] = useState(String(variety.tree_spacing_m));
  const [note, setNote] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Edit variety: {variety.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Seedling unit price (KES)</Label>
          <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <Label>Row spacing (m)</Label>
          <Input type="number" step={0.01} value={row} onChange={(e) => setRow(e.target.value)} />
        </div>
        <div>
          <Label>Tree spacing (m)</Label>
          <Input type="number" step={0.01} value={tree} onChange={(e) => setTree(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Audit note</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="bg-[var(--forest)]"
            disabled={saving}
            onClick={() =>
              onSave({
                seedling_unit_price_kes: price === "" ? null : Number(price),
                row_spacing_m: Number(row),
                tree_spacing_m: Number(tree),
                note,
              })
            }
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LabourEditForm({
  rate,
  saving,
  onCancel,
  onSave,
}: {
  rate: LabourRate;
  saving: boolean;
  onCancel: () => void;
  onSave: (p: {
    rate_kes: number | null;
    verification_status: string;
    productivity_note: string;
  }) => void;
}) {
  const [value, setValue] = useState(rate.rate_kes?.toString() ?? "");
  const [status, setStatus] = useState(rate.verification_status);
  const [note, setNote] = useState(rate.productivity_note ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Edit labour: {rate.task_name}</CardTitle>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Rate (KES)</Label>
          <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="subject_to_confirmation">Subject to confirmation</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Productivity / notes</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="bg-[var(--forest)]"
            disabled={saving}
            onClick={() =>
              onSave({
                rate_kes: value === "" ? null : Number(value),
                verification_status: status,
                productivity_note: note,
              })
            }
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}