CREATE OR REPLACE FUNCTION public.is_ccak_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','national_admin','super_admin','county_admin'));
$$;

CREATE TABLE public.coffee_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  row_spacing_m numeric(6,2) NOT NULL CHECK (row_spacing_m > 0),
  tree_spacing_m numeric(6,2) NOT NULL CHECK (tree_spacing_m > 0),
  planting_density_per_acre integer GENERATED ALWAYS AS (ROUND(4046.86 / (row_spacing_m * tree_spacing_m))::integer) STORED,
  seedling_unit_price_kes numeric(12,2),
  characteristics text, disease_susceptibility text, management_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0, description text
);
CREATE TABLE public.coffee_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE, name text NOT NULL, description text, unit text NOT NULL,
  base_unit_price_kes numeric(14,2),
  labour_component_kes numeric(14,2) DEFAULT 0, material_component_kes numeric(14,2) DEFAULT 0,
  equipment_component_kes numeric(14,2) DEFAULT 0, transport_component_kes numeric(14,2) DEFAULT 0,
  minimum_charge_kes numeric(14,2) DEFAULT 0,
  terrain_multiplier_flat numeric(6,3) DEFAULT 1.0, terrain_multiplier_gentle numeric(6,3) DEFAULT 1.05,
  terrain_multiplier_moderate numeric(6,3) DEFAULT 1.15, terrain_multiplier_steep numeric(6,3) DEFAULT 1.30,
  terrain_multiplier_extreme numeric(6,3) DEFAULT 1.50,
  is_package boolean NOT NULL DEFAULT false, package_includes text[],
  verification_status text NOT NULL DEFAULT 'subject_to_confirmation' CHECK (verification_status IN ('verified','subject_to_confirmation','expired')),
  source_name text, source_link text, last_verified_at date, effective_from date DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.price_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.coffee_services(id) ON DELETE SET NULL,
  variety_id uuid REFERENCES public.coffee_varieties(id) ON DELETE SET NULL,
  labour_rate_id uuid,
  field_name text NOT NULL, old_value numeric(14,2), new_value numeric(14,2),
  changed_by uuid, changed_at timestamptz NOT NULL DEFAULT now(), note text
);
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, nursery_location text, county text,
  phone text, certification_status text, notes text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.supplier_seedling_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  variety_id uuid NOT NULL REFERENCES public.coffee_varieties(id) ON DELETE CASCADE,
  unit_price_kes numeric(12,2) NOT NULL, stock_available boolean DEFAULT true, last_verified_at date,
  verification_status text NOT NULL DEFAULT 'subject_to_confirmation', UNIQUE (supplier_id, variety_id)
);
CREATE TABLE public.labour_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_code text NOT NULL UNIQUE, task_name text NOT NULL,
  unit text NOT NULL, rate_kes numeric(12,2), productivity_note text, county text,
  verification_status text NOT NULL DEFAULT 'subject_to_confirmation', last_verified_at date,
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE public.farm_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
  farmer_full_name text NOT NULL, phone text, county text, subcounty text, farm_location text,
  farm_size_acres numeric(10,2) NOT NULL, area_under_coffee_acres numeric(10,2), existing_trees integer,
  experience_years numeric(5,1), establishment_status text, terrain text, farm_shape text,
  water_availability text[], land_utilisation_factor numeric(5,3) DEFAULT 0.85,
  selected_variety_ids uuid[], notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.farm_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.farm_assessments(id) ON DELETE CASCADE,
  variety_id uuid REFERENCES public.coffee_varieties(id),
  theoretical_trees integer, plantable_area_acres numeric(10,2), seedlings_needed integer,
  replacement_seedlings integer, actual_planting_population integer, calculation_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quotation_number text NOT NULL UNIQUE,
  assessment_id uuid REFERENCES public.farm_assessments(id) ON DELETE SET NULL, user_id uuid,
  farmer_full_name text NOT NULL, phone text, county text, farm_location text, farm_size_acres numeric(10,2),
  variety_summary text, estimated_trees integer,
  subtotal_kes numeric(14,2), transport_kes numeric(14,2) DEFAULT 0, tax_kes numeric(14,2) DEFAULT 0,
  grand_total_kes numeric(14,2), cost_per_acre_kes numeric(14,2),
  labour_total_kes numeric(14,2) DEFAULT 0, materials_total_kes numeric(14,2) DEFAULT 0,
  equipment_total_kes numeric(14,2) DEFAULT 0, consultancy_total_kes numeric(14,2) DEFAULT 0,
  has_unconfirmed_prices boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','revised','accepted','expired','cancelled')),
  valid_until date, payment_terms text, exclusions text, assumptions text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.coffee_services(id), variety_id uuid REFERENCES public.coffee_varieties(id),
  item_type text NOT NULL, description text NOT NULL, quantity numeric(14,3) NOT NULL DEFAULT 1, unit text NOT NULL,
  unit_price_kes numeric(14,2), line_total_kes numeric(14,2), is_price_confirmed boolean NOT NULL DEFAULT false,
  sort_order integer DEFAULT 0
);
CREATE TABLE public.service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quotation_id uuid REFERENCES public.quotations(id),
  assessment_id uuid REFERENCES public.farm_assessments(id), user_id uuid,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','inspection_scheduled','quoted','confirmed','in_progress','completed','cancelled')),
  preferred_date date, notes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coffee_services_category ON public.coffee_services(category_id);
CREATE INDEX idx_farm_assessments_user ON public.farm_assessments(user_id);
CREATE INDEX idx_quotations_user ON public.quotations(user_id);

GRANT SELECT ON public.coffee_varieties, public.service_categories, public.coffee_services, public.labour_rates, public.suppliers, public.supplier_seedling_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coffee_varieties, public.service_categories, public.coffee_services, public.labour_rates, public.suppliers, public.supplier_seedling_prices TO authenticated;
GRANT SELECT ON public.price_change_history TO authenticated;
GRANT SELECT ON public.farm_assessments, public.farm_calculations, public.quotations, public.quotation_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.service_bookings TO authenticated;
GRANT ALL ON public.coffee_varieties, public.service_categories, public.coffee_services, public.price_change_history, public.suppliers, public.supplier_seedling_prices, public.labour_rates, public.farm_assessments, public.farm_calculations, public.quotations, public.quotation_items, public.service_bookings TO service_role;

ALTER TABLE public.coffee_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coffee_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_seedling_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active varieties" ON public.coffee_varieties FOR SELECT USING (is_active OR public.is_ccak_staff());
CREATE POLICY "Anyone reads categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Anyone reads active services" ON public.coffee_services FOR SELECT USING (is_active OR public.is_ccak_staff());
CREATE POLICY "Anyone reads active labour rates" ON public.labour_rates FOR SELECT USING (is_active OR public.is_ccak_staff());
CREATE POLICY "Anyone reads active suppliers" ON public.suppliers FOR SELECT USING (is_active OR public.is_ccak_staff());
CREATE POLICY "Anyone reads seedling prices" ON public.supplier_seedling_prices FOR SELECT USING (true);
CREATE POLICY "Staff manage varieties" ON public.coffee_varieties FOR ALL TO authenticated USING (public.is_ccak_staff()) WITH CHECK (public.is_ccak_staff());
CREATE POLICY "Staff manage categories" ON public.service_categories FOR ALL TO authenticated USING (public.is_ccak_staff()) WITH CHECK (public.is_ccak_staff());
CREATE POLICY "Staff manage services" ON public.coffee_services FOR ALL TO authenticated USING (public.is_ccak_staff()) WITH CHECK (public.is_ccak_staff());
CREATE POLICY "Staff manage labour rates" ON public.labour_rates FOR ALL TO authenticated USING (public.is_ccak_staff()) WITH CHECK (public.is_ccak_staff());
CREATE POLICY "Staff manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_ccak_staff()) WITH CHECK (public.is_ccak_staff());
CREATE POLICY "Staff manage seedling prices" ON public.supplier_seedling_prices FOR ALL TO authenticated USING (public.is_ccak_staff()) WITH CHECK (public.is_ccak_staff());
CREATE POLICY "Staff read price history" ON public.price_change_history FOR SELECT TO authenticated USING (public.is_ccak_staff());
CREATE POLICY "Owners and staff read assessments" ON public.farm_assessments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_ccak_staff());
CREATE POLICY "Owners and staff read calculations" ON public.farm_calculations FOR SELECT TO authenticated USING (public.is_ccak_staff() OR EXISTS (SELECT 1 FROM public.farm_assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));
CREATE POLICY "Owners and staff read quotations" ON public.quotations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_ccak_staff());
CREATE POLICY "Owners and staff read quotation items" ON public.quotation_items FOR SELECT TO authenticated USING (public.is_ccak_staff() OR EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_id AND q.user_id = auth.uid()));
CREATE POLICY "Owners read bookings" ON public.service_bookings FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_ccak_staff());
CREATE POLICY "Owners request bookings" ON public.service_bookings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'requested');
CREATE POLICY "Staff update bookings" ON public.service_bookings FOR UPDATE TO authenticated USING (public.is_ccak_staff()) WITH CHECK (public.is_ccak_staff());

-- Atomic, audited price updates
CREATE OR REPLACE FUNCTION public.update_coffee_service_price(
  p_service_id uuid, p_base_unit_price_kes numeric,
  p_labour_component_kes numeric DEFAULT NULL, p_material_component_kes numeric DEFAULT NULL,
  p_equipment_component_kes numeric DEFAULT NULL, p_transport_component_kes numeric DEFAULT NULL,
  p_minimum_charge_kes numeric DEFAULT NULL, p_verification_status text DEFAULT 'subject_to_confirmation',
  p_source_name text DEFAULT NULL, p_source_link text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS public.coffee_services LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row public.coffee_services; new_row public.coffee_services; st text;
BEGIN
  IF NOT public.is_ccak_staff() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF p_base_unit_price_kes IS NOT NULL AND (p_base_unit_price_kes < 0 OR p_base_unit_price_kes > 100000000) THEN RAISE EXCEPTION 'Invalid price'; END IF;
  SELECT * INTO old_row FROM public.coffee_services WHERE id = p_service_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service not found'; END IF;
  st := COALESCE(p_verification_status, old_row.verification_status);
  IF st = 'verified' AND (p_base_unit_price_kes IS NULL OR coalesce(btrim(COALESCE(p_source_name, old_row.source_name)),'') = '') THEN
    RAISE EXCEPTION 'A verified price needs an amount and a source';
  END IF;
  UPDATE public.coffee_services SET
    base_unit_price_kes = p_base_unit_price_kes,
    labour_component_kes = COALESCE(p_labour_component_kes, labour_component_kes),
    material_component_kes = COALESCE(p_material_component_kes, material_component_kes),
    equipment_component_kes = COALESCE(p_equipment_component_kes, equipment_component_kes),
    transport_component_kes = COALESCE(p_transport_component_kes, transport_component_kes),
    minimum_charge_kes = COALESCE(p_minimum_charge_kes, minimum_charge_kes),
    verification_status = st,
    source_name = COALESCE(p_source_name, source_name), source_link = COALESCE(p_source_link, source_link),
    last_verified_at = CASE WHEN st = 'verified' THEN CURRENT_DATE ELSE last_verified_at END,
    updated_at = now()
  WHERE id = p_service_id RETURNING * INTO new_row;
  INSERT INTO public.price_change_history (service_id, field_name, old_value, new_value, changed_by, note)
  VALUES (p_service_id, 'base_unit_price_kes', old_row.base_unit_price_kes, new_row.base_unit_price_kes, auth.uid(),
    concat_ws(' · ', 'status: ' || st, nullif(btrim(p_note), '')));
  RETURN new_row;
END $$;

CREATE OR REPLACE FUNCTION public.update_variety_seedling_price(p_variety_id uuid, p_seedling_unit_price_kes numeric, p_note text DEFAULT NULL)
RETURNS public.coffee_varieties LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row public.coffee_varieties; new_row public.coffee_varieties;
BEGIN
  IF NOT public.is_ccak_staff() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF p_seedling_unit_price_kes IS NOT NULL AND (p_seedling_unit_price_kes < 0 OR p_seedling_unit_price_kes > 1000000) THEN RAISE EXCEPTION 'Invalid price'; END IF;
  SELECT * INTO old_row FROM public.coffee_varieties WHERE id = p_variety_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Variety not found'; END IF;
  UPDATE public.coffee_varieties SET seedling_unit_price_kes = p_seedling_unit_price_kes, updated_at = now() WHERE id = p_variety_id RETURNING * INTO new_row;
  INSERT INTO public.price_change_history (variety_id, field_name, old_value, new_value, changed_by, note)
  VALUES (p_variety_id, 'seedling_unit_price_kes', old_row.seedling_unit_price_kes, new_row.seedling_unit_price_kes, auth.uid(), nullif(btrim(p_note), ''));
  RETURN new_row;
END $$;

CREATE OR REPLACE FUNCTION public.update_labour_rate(p_rate_id uuid, p_rate_kes numeric, p_verification_status text, p_productivity_note text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS public.labour_rates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row public.labour_rates; new_row public.labour_rates;
BEGIN
  IF NOT public.is_ccak_staff() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF p_verification_status NOT IN ('verified','subject_to_confirmation','expired') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF p_verification_status = 'verified' AND p_rate_kes IS NULL THEN RAISE EXCEPTION 'A verified rate needs an amount'; END IF;
  SELECT * INTO old_row FROM public.labour_rates WHERE id = p_rate_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rate not found'; END IF;
  UPDATE public.labour_rates SET rate_kes = p_rate_kes, verification_status = p_verification_status,
    productivity_note = COALESCE(p_productivity_note, productivity_note),
    last_verified_at = CASE WHEN p_verification_status = 'verified' THEN CURRENT_DATE ELSE last_verified_at END
  WHERE id = p_rate_id RETURNING * INTO new_row;
  INSERT INTO public.price_change_history (labour_rate_id, field_name, old_value, new_value, changed_by, note)
  VALUES (p_rate_id, 'labour_rate_kes', old_row.rate_kes, new_row.rate_kes, auth.uid(), nullif(btrim(p_note), ''));
  RETURN new_row;
END $$;

-- Quotation save: public, atomic, server-priced from the catalogue (client totals are never trusted)
CREATE OR REPLACE FUNCTION public.save_farm_quotation(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a_id uuid; q_id uuid; q_num text; v public.coffee_varieties; it jsonb; s public.coffee_services;
  acres numeric; qty numeric; mult numeric; unit_p numeric; line numeric; subtotal numeric := 0; all_priced boolean := true;
  terrain text; seedlings integer; ord integer := 0; labour numeric := 0; mat numeric := 0; equip numeric := 0; cons numeric := 0; seed_cost numeric;
BEGIN
  IF char_length(btrim(coalesce(payload->>'farmer_full_name',''))) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Enter the farmer name'; END IF;
  acres := (payload->>'farm_size_acres')::numeric;
  IF acres IS NULL OR acres <= 0 OR acres > 100000 THEN RAISE EXCEPTION 'Enter a valid farm size'; END IF;
  terrain := coalesce(payload->>'terrain','flat');
  IF terrain NOT IN ('flat','gently_sloping','moderately_steep','very_steep','extremely_steep') THEN RAISE EXCEPTION 'Invalid terrain'; END IF;
  IF jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) > 80 THEN RAISE EXCEPTION 'Too many items'; END IF;
  seedlings := greatest(0, least(coalesce((payload->>'seedlings_needed')::integer, 0), 10000000));

  INSERT INTO public.farm_assessments(user_id, farmer_full_name, phone, county, subcounty, farm_location, farm_size_acres, area_under_coffee_acres,
    existing_trees, experience_years, establishment_status, terrain, farm_shape, water_availability, land_utilisation_factor, selected_variety_ids)
  VALUES (auth.uid(), btrim(payload->>'farmer_full_name'), left(payload->>'phone',20), left(payload->>'county',40), left(payload->>'subcounty',80), left(payload->>'farm_location',200),
    acres, nullif(payload->>'area_under_coffee_acres','')::numeric, nullif(payload->>'existing_trees','')::integer, nullif(payload->>'experience_years','')::numeric,
    left(payload->>'establishment_status',30), terrain, left(payload->>'farm_shape',30), ARRAY(SELECT left(x,40) FROM jsonb_array_elements_text(coalesce(payload->'water','[]'::jsonb)) x LIMIT 6),
    least(1, greatest(0.5, coalesce((payload->>'land_utilisation_factor')::numeric, 0.85))),
    ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(coalesce(payload->'variety_ids','[]'::jsonb)) x LIMIT 10))
  RETURNING id INTO a_id;

  SELECT * INTO v FROM public.coffee_varieties WHERE id = nullif(payload->>'primary_variety_id','')::uuid AND is_active;
  IF FOUND THEN
    INSERT INTO public.farm_calculations(assessment_id, variety_id, theoretical_trees, plantable_area_acres, seedlings_needed, replacement_seedlings, actual_planting_population, calculation_payload)
    VALUES (a_id, v.id, (payload->>'theoretical_trees')::integer, (payload->>'plantable_area_acres')::numeric, seedlings, (payload->>'replacement_seedlings')::integer, (payload->>'actual_planting_population')::integer, payload->'population');
  END IF;

  q_num := 'CCAK-QT-' || to_char(now() AT TIME ZONE 'Africa/Nairobi','YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO public.quotations(quotation_number, assessment_id, user_id, farmer_full_name, phone, county, farm_location, farm_size_acres, variety_summary, estimated_trees, status, valid_until, payment_terms, exclusions, assumptions)
  VALUES (q_num, a_id, auth.uid(), btrim(payload->>'farmer_full_name'), left(payload->>'phone',20), left(payload->>'county',40), left(payload->>'farm_location',200), acres,
    v.name, (payload->>'actual_planting_population')::integer, 'submitted', (now() + interval '30 days')::date,
    '50% mobilisation, balance on completion. Final amounts subject to field verification.',
    'Chemicals/dosages not prescribed. Unverified catalogue prices are marked subject to confirmation.', left(payload->>'assumptions',2000))
  RETURNING id INTO q_id;

  FOR it IN SELECT * FROM jsonb_array_elements(coalesce(payload->'items','[]'::jsonb)) LOOP
    SELECT * INTO s FROM public.coffee_services WHERE id = (it->>'service_id')::uuid AND is_active;
    CONTINUE WHEN NOT FOUND;
    qty := greatest(0, least(coalesce((it->>'quantity')::numeric, 1), 100000000));
    mult := CASE terrain WHEN 'gently_sloping' THEN s.terrain_multiplier_gentle WHEN 'moderately_steep' THEN s.terrain_multiplier_moderate WHEN 'very_steep' THEN s.terrain_multiplier_steep WHEN 'extremely_steep' THEN s.terrain_multiplier_extreme ELSE s.terrain_multiplier_flat END;
    unit_p := CASE WHEN s.base_unit_price_kes IS NULL THEN NULL ELSE round(s.base_unit_price_kes * coalesce(mult,1), 2) END;
    line := CASE WHEN unit_p IS NULL THEN NULL ELSE greatest(round(unit_p * qty, 2), coalesce(s.minimum_charge_kes,0)) END;
    IF line IS NULL THEN all_priced := false; ELSE subtotal := subtotal + line; END IF;
    labour := labour + coalesce(s.labour_component_kes,0) * qty * coalesce(mult,1);
    mat := mat + coalesce(s.material_component_kes,0) * qty; equip := equip + coalesce(s.equipment_component_kes,0) * qty;
    IF s.code LIKE 'CONS\_%' THEN cons := cons + coalesce(line,0); END IF;
    ord := ord + 1;
    INSERT INTO public.quotation_items(quotation_id, service_id, item_type, description, quantity, unit, unit_price_kes, line_total_kes, is_price_confirmed, sort_order)
    VALUES (q_id, s.id, 'service', s.name, qty, s.unit, unit_p, line, s.verification_status = 'verified' AND unit_p IS NOT NULL, ord);
  END LOOP;

  IF (payload->>'include_seedlings')::boolean IS TRUE AND seedlings > 0 AND v.id IS NOT NULL THEN
    seed_cost := CASE WHEN v.seedling_unit_price_kes IS NULL THEN NULL ELSE round(v.seedling_unit_price_kes * seedlings, 2) END;
    IF seed_cost IS NULL THEN all_priced := false; ELSE subtotal := subtotal + seed_cost; mat := mat + seed_cost; END IF;
    INSERT INTO public.quotation_items(quotation_id, variety_id, item_type, description, quantity, unit, unit_price_kes, line_total_kes, is_price_confirmed, sort_order)
    VALUES (q_id, v.id, 'seedling', 'Seedlings (' || v.name || ') incl. replacement', seedlings, 'seedling', v.seedling_unit_price_kes, seed_cost, v.seedling_unit_price_kes IS NOT NULL, ord + 1);
  END IF;

  UPDATE public.quotations SET has_unconfirmed_prices = NOT all_priced,
    subtotal_kes = CASE WHEN all_priced THEN subtotal END, grand_total_kes = CASE WHEN all_priced THEN subtotal END,
    cost_per_acre_kes = CASE WHEN all_priced THEN round(subtotal / acres, 2) END,
    labour_total_kes = round(labour,2), materials_total_kes = round(mat,2), equipment_total_kes = round(equip,2), consultancy_total_kes = round(cons,2)
  WHERE id = q_id;
  RETURN jsonb_build_object('quotation_id', q_id, 'quotation_number', q_num, 'has_unconfirmed_prices', NOT all_priced, 'grand_total_kes', CASE WHEN all_priced THEN subtotal END);
END $$;

REVOKE ALL ON FUNCTION public.update_coffee_service_price, public.update_variety_seedling_price, public.update_labour_rate, public.save_farm_quotation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_coffee_service_price, public.update_variety_seedling_price, public.update_labour_rate TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_farm_quotation TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_ccak_staff TO authenticated;

-- Catalogue seed (all prices NULL = subject to confirmation)
INSERT INTO public.coffee_varieties (code, name, row_spacing_m, tree_spacing_m, characteristics, disease_susceptibility, management_notes) VALUES
  ('SL28','SL28',2.74,2.74,'Classic Kenya arabica, excellent cup quality','Susceptible to CBD and CLR','Requires intensive disease management'),
  ('SL34','SL34',2.74,2.74,'High quality, good altitude performance','Susceptible to CBD and CLR','Similar management to SL28'),
  ('K7','K7',2.74,2.74,'Drought tolerant, good for lower altitudes','Moderate','Verify current agronomic spacing with CRI/KALRO'),
  ('RUIRU11','Ruiru 11',2.00,2.00,'Compact, disease resistant hybrid','Resistant to CBD and CLR','Higher density planting'),
  ('BATIAN','Batian',2.10,2.50,'Tall, disease resistant, good yields','Resistant to CBD and CLR','Wider spacing than Ruiru 11')
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.service_categories (slug, name, sort_order, description) VALUES
  ('farm-layout','Farm Layout Services',10,'Basic and advanced layout & planning'),
  ('seedlings','Seedlings & Planting Materials',20,'Seedlings, transport, planting labour'),
  ('land-prep','Land Preparation & Establishment',30,'Clearing, holes, manure, planting'),
  ('maintenance','Farm Maintenance',40,'Pruning, weeding, nutrition, pest & disease'),
  ('spraying','Spraying Services',50,'Labour, equipment, PPE, transport'),
  ('harvesting','Harvesting Services',60,'Picking, sorting, transport of cherry'),
  ('post-harvest','Post-Harvest & Value Addition',70,'Pulping, drying, hulling, grading'),
  ('water-infra','Water & Farm Infrastructure',80,'Water harvesting, irrigation, drainage'),
  ('consultancy','Consultancy & Other Services',90,'Rehabilitation, training, certification')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.coffee_services (category_id, code, name, unit, is_package, package_includes)
SELECT c.id, x.code, x.name, x.unit, x.pkg, x.inc FROM (VALUES
  ('farm-layout','LAYOUT_BASIC','Basic Farm Layout Package','acre',true,ARRAY['LAYOUT_ASSESS','LAYOUT_MEASURE','LAYOUT_SPACING','LAYOUT_MARK']),
  ('farm-layout','LAYOUT_ADVANCED','Advanced Farm Layout Package','acre',true,NULL::text[]),
  ('farm-layout','LAYOUT_ASSESS','Farm Assessment','acre',false,NULL),
  ('farm-layout','LAYOUT_MEASURE','Farm Measurement','acre',false,NULL),
  ('farm-layout','LAYOUT_SPACING','Spacing Calculation & Row Planning','acre',false,NULL),
  ('farm-layout','LAYOUT_MARK','Planting-Point Marking','acre',false,NULL),
  ('farm-layout','LAYOUT_CONTOUR','Contour Mapping & Row Marking','acre',false,NULL),
  ('farm-layout','LAYOUT_TERRACE','Bench Terrace Planning','acre',false,NULL),
  ('seedlings','SEED_PROCURE','Seedling Procurement Assistance','project',false,NULL),
  ('seedlings','SEED_TRANSPORT','Seedling Transport / Delivery','item',false,NULL),
  ('seedlings','SEED_PLANT_LABOUR','Seedling Planting Labour','tree',false,NULL),
  ('land-prep','LAND_CLEAR','Bush Clearing','acre',false,NULL),
  ('land-prep','LAND_PREP','Land Preparation','acre',false,NULL),
  ('land-prep','SOIL_SAMPLE','Soil Sampling','item',false,NULL),
  ('land-prep','SOIL_LAB','Laboratory Soil Analysis','item',false,NULL),
  ('land-prep','HOLE_DIG','Hole Digging','hole',false,NULL),
  ('land-prep','HOLE_FILL','Hole Filling','hole',false,NULL),
  ('land-prep','MANURE_APP','Manure Application','tree',false,NULL),
  ('land-prep','MULCH','Mulching','tree',false,NULL),
  ('maintenance','PRUNE_MAIN','Main Pruning','tree',false,NULL),
  ('maintenance','PRUNE_MAINT','Maintenance Pruning','tree',false,NULL),
  ('maintenance','PRUNE_REJUV','Rejuvenation / Stumping','tree',false,NULL),
  ('maintenance','DESUCKER','De-suckering & Sucker Selection','tree',false,NULL),
  ('maintenance','WEED_MANUAL','Manual Weeding','acre',false,NULL),
  ('maintenance','WEED_SLASH','Slashing','acre',false,NULL),
  ('maintenance','FERT_APP','Fertiliser Application','acre',false,NULL),
  ('maintenance','SCOUT','Farm Scouting (Pests & Diseases)','acre',false,NULL),
  ('spraying','SPRAY_LABOUR','Spraying Labour (per round)','acre',false,NULL),
  ('spraying','SPRAY_EQUIP','Spraying Equipment Charge','round',false,NULL),
  ('spraying','SPRAY_PPE','Protective Equipment Charge','round',false,NULL),
  ('harvesting','HARVEST_PICK','Cherry Picking Labour','kg',false,NULL),
  ('harvesting','HARVEST_SORT','Cherry Sorting','kg',false,NULL),
  ('harvesting','HARVEST_TRANS','Cherry Transport to Factory','kg',false,NULL),
  ('post-harvest','POST_PULP','Pulping','kg',false,NULL),
  ('post-harvest','POST_DRY','Drying & Moisture Management','kg',false,NULL),
  ('post-harvest','POST_HULL','Hulling','kg',false,NULL),
  ('post-harvest','POST_GRADE','Grading','kg',false,NULL),
  ('water-infra','WATER_HARVEST','Rainwater Harvesting Design','project',false,NULL),
  ('water-infra','WATER_DRIP','Drip Irrigation Layout','acre',false,NULL),
  ('water-infra','WATER_DRAIN','Farm Drainage Construction','acre',false,NULL),
  ('consultancy','CONS_REHAB','Farm Rehabilitation Consultancy','project',false,NULL),
  ('consultancy','CONS_YIELD','Yield Estimation & Productivity Assessment','project',false,NULL),
  ('consultancy','CONS_TRAIN','Agronomy Training Session','item',false,NULL),
  ('consultancy','CONS_CERT','Certification Preparation Support','project',false,NULL)
) AS x(cat, code, name, unit, pkg, inc) JOIN public.service_categories c ON c.slug = x.cat
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.labour_rates (task_code, task_name, unit, rate_kes, productivity_note) VALUES
  ('GENERAL_DAY','General farm labour (per worker-day)','per_day',NULL,'Local rate varies by county'),
  ('PRUNE_DAY','Pruning labour productivity','per_day',NULL,'Trees per worker-day depends on tree size'),
  ('PICK_KG','Cherry picking','per_kg',NULL,'Or per debe — convert using editable kg/debe')
ON CONFLICT (task_code) DO NOTHING;