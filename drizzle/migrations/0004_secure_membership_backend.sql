ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sub_county text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id uuid GENERATED ALWAYS AS (id) STORED;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS member_number text GENERATED ALWAYS AS (member_no) STORED;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS county text;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_roles ADD CONSTRAINT county_role_requires_county CHECK (role <> 'county_admin' OR (county IS NOT NULL AND length(trim(county)) > 0));
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS inquiry_type text GENERATED ALWAYS AS (kind) STORED;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','closed'));
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active','unsubscribed'));
CREATE SEQUENCE public.application_reference_seq;
CREATE SEQUENCE public.membership_number_seq;
REVOKE ALL ON SEQUENCE public.application_reference_seq, public.membership_number_seq FROM PUBLIC, anon, authenticated;

CREATE TABLE public.membership_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_number text NOT NULL UNIQUE DEFAULT ('CCAK-APP-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.application_reference_seq')::text,6,'0')),
 applicant_user_id uuid NOT NULL REFERENCES public.profiles(id),
 full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 120),
 email text NOT NULL CHECK (length(email) BETWEEN 3 AND 255),
 phone text NOT NULL CHECK (phone ~ '^\+?[0-9 ]{9,15}$'),
 county text NOT NULL CHECK (length(county) BETWEEN 1 AND 40),
 sub_county text CHECK (length(sub_county) <= 80),
 member_type public.member_type NOT NULL,
 business_name text CHECK (length(business_name) <= 150),
 farm_size text CHECK (length(farm_size) <= 60),
 photo_path text CHECK (length(photo_path) <= 300),
 supporting_documents text[] NOT NULL DEFAULT '{}',
 terms_accepted_at timestamptz NOT NULL DEFAULT now(),
 application_status public.member_status NOT NULL DEFAULT 'pending',
 submission_date timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid REFERENCES public.profiles(id),
 review_notes text CHECK (length(review_notes) <= 2000),
 reviewed_at timestamptz
);
GRANT SELECT ON public.membership_applications TO authenticated;
GRANT ALL ON public.membership_applications TO service_role;
ALTER TABLE public.membership_applications ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX one_open_application_per_member ON public.membership_applications(applicant_user_id) WHERE application_status IN ('pending','approved');
CREATE INDEX applications_county_status ON public.membership_applications(county,application_status,submission_date DESC);
CREATE INDEX applications_owner ON public.membership_applications(applicant_user_id,submission_date DESC);

CREATE TABLE public.audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid,
 action text NOT NULL,
 affected_table text NOT NULL,
 record_id uuid,
 details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX audit_logs_created ON public.audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','super_admin')) $$;
CREATE OR REPLACE FUNCTION public.is_national_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','super_admin','national_admin')) $$;
CREATE OR REPLACE FUNCTION public.can_review_county(target_county text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.is_national_admin() OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='county_admin' AND county=target_county) $$;
REVOKE ALL ON FUNCTION public.is_super_admin(), public.is_national_admin(), public.can_review_county(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(), public.is_national_admin(), public.can_review_county(text) TO authenticated, service_role;

CREATE POLICY "Applicants and scoped reviewers read applications" ON public.membership_applications FOR SELECT TO authenticated USING (applicant_user_id=auth.uid() OR public.can_review_county(county));
CREATE POLICY "National admins read audit trail" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_national_admin());
DROP POLICY "Admins manage roles" ON public.user_roles;
DROP POLICY "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles and super admins read roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_super_admin());
DROP POLICY "Members read own profile" ON public.profiles;
DROP POLICY "Admins update profiles" ON public.profiles;
CREATE POLICY "Members and scoped staff read profiles" ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid() OR public.can_review_county(county));
CREATE POLICY "Scoped staff update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.can_review_county(county)) WITH CHECK (public.can_review_county(county));
CREATE POLICY "National admins read inquiries" ON public.inquiries FOR SELECT TO authenticated USING (public.is_national_admin());
CREATE POLICY "National admins update inquiries" ON public.inquiries FOR UPDATE TO authenticated USING (public.is_national_admin()) WITH CHECK (public.is_national_admin());
CREATE POLICY "National admins read subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.is_national_admin());
CREATE POLICY "National admins update subscribers" ON public.newsletter_subscribers FOR UPDATE TO authenticated USING (public.is_national_admin()) WITH CHECK (public.is_national_admin());
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT INSERT ON public.inquiries, public.newsletter_subscribers TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.inquiries, public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.profiles, public.user_roles, public.inquiries, public.newsletter_subscribers TO service_role;

CREATE OR REPLACE FUNCTION public.protect_profile_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'Profile identity cannot change'; END IF;
 NEW.email := OLD.email;
 IF NEW.status IS DISTINCT FROM OLD.status OR NEW.member_no IS DISTINCT FROM OLD.member_no OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
  IF NOT public.can_review_county(OLD.county) OR NOT EXISTS(SELECT 1 FROM public.membership_applications a WHERE a.applicant_user_id=OLD.id AND a.application_status=NEW.status AND a.reviewed_by=auth.uid() AND a.reviewed_at=NEW.reviewed_at) THEN
   RAISE EXCEPTION 'Membership decisions must use the authorised review workflow';
  END IF;
 END IF;
 IF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at AND NOT EXISTS(SELECT 1 FROM public.membership_applications WHERE applicant_user_id=OLD.id AND submission_date=NEW.submitted_at) THEN RAISE EXCEPTION 'Submission timestamp is managed by the application workflow'; END IF;
 NEW.updated_at := now();
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.submit_membership_application(payload jsonb) RETURNS public.membership_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.profiles; result public.membership_applications; docs text[]; c text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to submit an application'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR p.email IS NULL THEN RAISE EXCEPTION 'A verified account profile is required'; END IF;
 IF payload->>'terms_accepted' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Accept the membership terms'; END IF;
 c := payload->>'county';
 IF c IS NULL OR NOT c = ANY(ARRAY['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang''a','Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot']) THEN RAISE EXCEPTION 'Choose a valid Kenyan county'; END IF;
 IF EXISTS(SELECT 1 FROM public.membership_applications WHERE applicant_user_id=p.id AND application_status IN ('pending','approved')) THEN RAISE EXCEPTION 'An active application already exists'; END IF;
 SELECT coalesce(array_agg(value),'{}') INTO docs FROM jsonb_array_elements_text(coalesce(payload->'supporting_documents','[]'::jsonb));
 IF cardinality(docs)>5 OR EXISTS(SELECT 1 FROM unnest(docs) d WHERE d NOT LIKE p.id::text || '/%' OR length(d)>300 OR d LIKE '%..%') THEN RAISE EXCEPTION 'Invalid supporting document paths'; END IF;
 IF coalesce(payload->>'photo_path','')<>'' AND ((payload->>'photo_path') NOT LIKE p.id::text || '/%' OR (payload->>'photo_path') LIKE '%..%') THEN RAISE EXCEPTION 'Invalid photo path'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(docs) d WHERE NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='supporting-documents' AND name=d)) THEN RAISE EXCEPTION 'Upload supporting documents before submission'; END IF;
 IF coalesce(payload->>'photo_path','')<>'' AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='member-photos' AND name=payload->>'photo_path') THEN RAISE EXCEPTION 'Upload the photo before submission'; END IF;
 INSERT INTO public.membership_applications(applicant_user_id,full_name,email,phone,county,sub_county,member_type,business_name,farm_size,photo_path,supporting_documents)
 VALUES(p.id,trim(payload->>'full_name'),p.email,trim(payload->>'phone'),c,payload->>'sub_county',(payload->>'member_type')::public.member_type,payload->>'business_name',payload->>'farm_size',nullif(payload->>'photo_path',''),docs) RETURNING * INTO result;
 UPDATE public.profiles SET full_name=result.full_name,phone=result.phone,county=result.county,sub_county=result.sub_county,member_type=result.member_type,business_name=result.business_name,farm_size=result.farm_size,photo_path=result.photo_path,submitted_at=result.submission_date WHERE id=p.id;
 INSERT INTO public.audit_logs(user_id,action,affected_table,record_id) VALUES(auth.uid(),'application_submitted','membership_applications',result.id);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.submit_membership_application(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_membership_application(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_membership_application(application_id uuid, decision public.member_status, notes text DEFAULT NULL) RETURNS public.membership_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.membership_applications; number text; review_time timestamptz := now();
BEGIN
 SELECT * INTO a FROM public.membership_applications WHERE id=application_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_review_county(a.county) THEN RAISE EXCEPTION 'Not authorised to review this application'; END IF;
 IF a.applicant_user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot review your own application'; END IF;
 IF a.application_status <> 'pending' THEN RAISE EXCEPTION 'This application has already been reviewed'; END IF;
 IF decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Choose approval or rejection'; END IF;
 IF decision='rejected' AND coalesce(length(trim(notes)),0)=0 THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;
 IF length(notes)>2000 THEN RAISE EXCEPTION 'Review notes are too long'; END IF;
 UPDATE public.membership_applications SET application_status=decision,review_notes=nullif(trim(notes),''),reviewed_by=auth.uid(),reviewed_at=review_time WHERE id=a.id RETURNING * INTO a;
 SELECT member_no INTO number FROM public.profiles WHERE id=a.applicant_user_id FOR UPDATE;
 IF decision='approved' AND number IS NULL THEN
  LOOP
   number := 'CCAK-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.membership_number_seq')::text,6,'0');
   EXIT WHEN NOT EXISTS(SELECT 1 FROM public.profiles WHERE member_no=number);
  END LOOP;
 END IF;
 UPDATE public.profiles SET status=decision,member_no=number,reviewed_at=review_time WHERE id=a.applicant_user_id;
 INSERT INTO public.audit_logs(user_id,action,affected_table,record_id,details) VALUES(auth.uid(),'application_' || decision::text,'membership_applications',a.id,jsonb_build_object('county',a.county,'review_notes',a.review_notes));
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.review_membership_application(uuid, public.member_status,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_membership_application(uuid, public.member_status,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_membership_role(target_user uuid,new_role public.app_role,assigned_county text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Only super administrators can assign roles'; END IF;
 IF new_role='county_admin' AND coalesce(length(trim(assigned_county)),0)=0 THEN RAISE EXCEPTION 'County assignment is required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target_user) THEN RAISE EXCEPTION 'Member not found'; END IF;
 INSERT INTO public.user_roles(user_id,role,county) VALUES(target_user,new_role,CASE WHEN new_role='county_admin' THEN assigned_county ELSE NULL END) ON CONFLICT(user_id,role) DO UPDATE SET county=EXCLUDED.county;
 INSERT INTO public.audit_logs(user_id,action,affected_table,record_id,details) VALUES(auth.uid(),'role_assigned','user_roles',target_user,jsonb_build_object('role',new_role,'county',assigned_county));
END $$;
REVOKE ALL ON FUNCTION public.assign_membership_role(uuid,public.app_role,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_membership_role(uuid,public.app_role,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_membership(number text) RETURNS TABLE(full_name text,member_number text,county text,member_type public.member_type,status public.member_status) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.full_name,p.member_no,p.county,p.member_type,p.status FROM public.profiles p WHERE p.member_no=number AND p.status='approved' AND EXISTS(SELECT 1 FROM public.membership_applications a WHERE a.applicant_user_id=p.id AND a.application_status='approved') $$;
REVOKE ALL ON FUNCTION public.verify_membership(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_membership(text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.membership_statistics() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('approved_members',count(*) FILTER(WHERE status='approved'),'counties',count(DISTINCT county) FILTER(WHERE status='approved'),'enterprises',count(*) FILTER(WHERE status='approved' AND member_type='enterprise')) FROM public.profiles $$;
REVOKE ALL ON FUNCTION public.membership_statistics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.membership_statistics() TO anon,authenticated;

CREATE POLICY "Scoped staff read member photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='member-photos' AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id::text=(storage.foldername(name))[1] AND public.can_review_county(p.county)));
CREATE POLICY "Members upload supporting documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='supporting-documents' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "Members and scoped staff read documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='supporting-documents' AND ((storage.foldername(name))[1]=auth.uid()::text OR EXISTS(SELECT 1 FROM public.membership_applications a WHERE a.applicant_user_id::text=(storage.foldername(name))[1] AND public.can_review_county(a.county))));
CREATE POLICY "Members delete unsubmitted documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='supporting-documents' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.membership_applications a WHERE name=ANY(a.supporting_documents)));

CREATE OR REPLACE FUNCTION public.audit_administrative_changes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND public.is_national_admin() THEN INSERT INTO public.audit_logs(user_id,action,affected_table,record_id) VALUES(auth.uid(),lower(TG_OP),TG_TABLE_NAME,coalesce(NEW.id,OLD.id)); END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER audit_inquiry_changes AFTER UPDATE OR DELETE ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.audit_administrative_changes();
CREATE TRIGGER audit_newsletter_changes AFTER UPDATE OR DELETE ON public.newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION public.audit_administrative_changes();