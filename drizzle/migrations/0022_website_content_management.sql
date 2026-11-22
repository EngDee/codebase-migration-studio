CREATE FUNCTION public.validate_website_content() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 NEW.updated_at=clock_timestamp();
 IF NEW.starts_at IS NOT NULL AND NEW.expires_at IS NOT NULL AND NEW.expires_at<=NEW.starts_at THEN RAISE EXCEPTION 'End must follow start'; END IF;
 IF TG_TABLE_NAME='shop_products' THEN
  IF jsonb_typeof(NEW.details->'price_kes') IS DISTINCT FROM 'number' OR (NEW.details->>'price_kes')::numeric<=0 OR (NEW.details->>'price_kes')::numeric<>trunc((NEW.details->>'price_kes')::numeric) THEN RAISE EXCEPTION 'A positive whole KES price is required'; END IF;
  IF jsonb_typeof(NEW.details->'is_physical') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Product type is required'; END IF;
  IF length(trim(coalesce(NEW.details->>'quantity_description','')))<2 THEN RAISE EXCEPTION 'Quantity description is required'; END IF;
  IF (NEW.details->>'is_physical')::boolean AND (jsonb_typeof(NEW.details->'unit_weight_grams') IS DISTINCT FROM 'number' OR (NEW.details->>'unit_weight_grams')::numeric<=0) THEN RAISE EXCEPTION 'Physical product weight must be positive'; END IF;
 END IF;
 IF TG_TABLE_NAME='site_documents' AND (coalesce(NEW.details->>'access_level','') NOT IN ('public','members_only') OR coalesce(NEW.details->>'file_path','')='') THEN RAISE EXCEPTION 'Document access and file are required'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.audit_website_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL THEN
 INSERT INTO public.audit_logs(user_id,action,affected_table,details) VALUES(auth.uid(),lower(TG_OP),TG_TABLE_NAME,jsonb_build_object('content_id',coalesce(NEW.id,OLD.id),'title',coalesce(NEW.title,OLD.title)));
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['site_notices','leadership_profiles','site_programs','shop_products','site_documents','site_gallery','site_settings'] LOOP
 EXECUTE format('CREATE TABLE public.%I (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, title text NOT NULL, details jsonb NOT NULL DEFAULT ''{}''::jsonb, is_active boolean NOT NULL DEFAULT false, display_order integer NOT NULL DEFAULT 0, starts_at timestamptz, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
 EXECUTE format('GRANT SELECT ON public.%I TO anon',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY cms_admin_all ON public.%I FOR ALL TO authenticated USING (public.is_national_admin()) WITH CHECK (public.is_national_admin())',t);
 IF t='site_documents' THEN
 EXECUTE format('CREATE POLICY cms_public_read ON public.%I FOR SELECT TO anon,authenticated USING (is_active AND (starts_at IS NULL OR starts_at<=now()) AND (expires_at IS NULL OR expires_at>now()) AND details->>''access_level''=''public'')',t);
 EXECUTE format('CREATE POLICY cms_member_read ON public.%I FOR SELECT TO authenticated USING (is_active AND (starts_at IS NULL OR starts_at<=now()) AND (expires_at IS NULL OR expires_at>now()) AND details->>''access_level''=''members_only'')',t);
 ELSE
 EXECUTE format('CREATE POLICY cms_public_read ON public.%I FOR SELECT TO anon,authenticated USING (is_active AND (starts_at IS NULL OR starts_at<=now()) AND (expires_at IS NULL OR expires_at>now()))',t);
 END IF;
 EXECUTE format('CREATE TRIGGER cms_validate BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_website_content()',t);
 EXECUTE format('CREATE TRIGGER cms_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_website_content()',t);
 END LOOP;
END $$;
CREATE POLICY website_media_admin ON storage.objects FOR ALL TO authenticated USING (bucket_id='website-media' AND public.is_national_admin()) WITH CHECK(bucket_id='website-media' AND public.is_national_admin());
CREATE POLICY website_media_read ON storage.objects FOR SELECT TO anon,authenticated USING (bucket_id='website-media');
CREATE POLICY website_documents_admin ON storage.objects FOR ALL TO authenticated USING (bucket_id='website-documents' AND public.is_national_admin()) WITH CHECK(bucket_id='website-documents' AND public.is_national_admin());
CREATE POLICY website_documents_read ON storage.objects FOR SELECT TO anon,authenticated USING (bucket_id='website-documents' AND EXISTS(SELECT 1 FROM public.site_documents d WHERE d.details->>'file_path'=name AND d.is_active AND (d.starts_at IS NULL OR d.starts_at<=now()) AND (d.expires_at IS NULL OR d.expires_at>now()) AND (d.details->>'access_level'='public' OR (auth.uid() IS NOT NULL AND d.details->>'access_level'='members_only'))));