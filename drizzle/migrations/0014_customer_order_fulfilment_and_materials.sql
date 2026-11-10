ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'not_dispatched' CHECK (delivery_status IN ('not_dispatched','preparing','dispatched','delivered'));
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS tracking_reference text;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS delivery_updated_at timestamptz;
CREATE TABLE public.shop_materials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id text NOT NULL CHECK (product_id = 'export-course'), title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 160), storage_path text NOT NULL UNIQUE, filename text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_materials TO authenticated;
GRANT ALL ON public.shop_materials TO service_role;
ALTER TABLE public.shop_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers see purchased material descriptions" ON public.shop_materials FOR SELECT TO authenticated USING (public.is_national_admin() OR EXISTS (SELECT 1 FROM public.shop_orders o, jsonb_array_elements(o.items) i WHERE o.user_id = auth.uid() AND i->>'id' = product_id));
CREATE POLICY "National staff manage study files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'shop-materials' AND public.is_national_admin()) WITH CHECK (bucket_id = 'shop-materials' AND public.is_national_admin());
CREATE POLICY "Paid customers read purchased study files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'shop-materials' AND EXISTS (SELECT 1 FROM public.shop_materials m JOIN public.shop_orders o ON o.user_id = auth.uid() WHERE m.storage_path = name AND o.status = 'paid' AND o.payment_environment = 'production' AND EXISTS (SELECT 1 FROM jsonb_array_elements(o.items) i WHERE i->>'id' = m.product_id)));
CREATE OR REPLACE FUNCTION public.publish_shop_material(material_product text, material_title text, material_path text, material_filename text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.is_national_admin() THEN RAISE EXCEPTION 'National administrator required'; END IF;
 IF material_product <> 'export-course' OR char_length(btrim(material_title)) NOT BETWEEN 2 AND 160 OR char_length(material_filename) NOT BETWEEN 1 AND 200 OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'shop-materials' AND name = material_path) THEN RAISE EXCEPTION 'Invalid material or missing file'; END IF;
 INSERT INTO public.shop_materials(product_id,title,storage_path,filename) VALUES(material_product,btrim(material_title),material_path,material_filename);
 INSERT INTO public.audit_logs(user_id,action,affected_table,details) VALUES(auth.uid(),'publish_shop_material','shop_materials',jsonb_build_object('path',material_path));
END $$;
REVOKE ALL ON FUNCTION public.publish_shop_material(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_shop_material(text,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.update_shop_delivery(order_id uuid, new_status text, tracking text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.shop_orders;
BEGIN
 IF NOT public.is_national_admin() THEN RAISE EXCEPTION 'National administrator required'; END IF;
 SELECT * INTO target FROM public.shop_orders WHERE id = order_id FOR UPDATE;
 IF target.id IS NULL OR target.status <> 'paid' OR target.payment_environment <> 'production' THEN RAISE EXCEPTION 'Confirmed live payment required; test orders cannot be dispatched'; END IF;
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(target.items) i WHERE (i->>'physical')::boolean = true) THEN RAISE EXCEPTION 'Digital order requires no delivery'; END IF;
 IF new_status NOT IN ('preparing','dispatched','delivered') OR char_length(coalesce(tracking,'')) > 200 OR (new_status IN ('dispatched','delivered') AND char_length(btrim(coalesce(tracking,''))) < 3) THEN RAISE EXCEPTION 'Valid delivery status and tracking reference required'; END IF;
 IF (target.delivery_status = 'dispatched' AND new_status = 'preparing') OR (target.delivery_status = 'delivered' AND new_status <> 'delivered') THEN RAISE EXCEPTION 'Delivery cannot move backwards'; END IF;
 UPDATE public.shop_orders SET delivery_status = new_status, tracking_reference = nullif(btrim(tracking),''), delivery_updated_at = now() WHERE id = order_id;
 INSERT INTO public.audit_logs(user_id,action,affected_table,record_id,details) VALUES(auth.uid(),'update_shop_delivery','shop_orders',order_id,jsonb_build_object('status',new_status,'tracking',tracking));
END $$;
REVOKE ALL ON FUNCTION public.update_shop_delivery(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_shop_delivery(uuid,text,text) TO authenticated;