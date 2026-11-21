ALTER TABLE public.profiles DISABLE TRIGGER validate_membership_identity;
UPDATE public.profiles SET national_id=NULL WHERE id='24c49ecc-d60b-4d03-9627-a4b94d52d19f' AND national_id='32501821';
UPDATE public.profiles SET national_id='32501821', date_of_birth='1994-08-17', gender='male', position='president' WHERE id='7bb0de54-c95c-4270-bfb4-f0af8a2f2ce3';
ALTER TABLE public.profiles ENABLE TRIGGER validate_membership_identity;
UPDATE public.membership_applications SET national_id='32501821', date_of_birth='1994-08-17', gender='male', position='president' WHERE applicant_user_id='7bb0de54-c95c-4270-bfb4-f0af8a2f2ce3';
INSERT INTO public.user_roles(user_id,role) SELECT '7bb0de54-c95c-4270-bfb4-f0af8a2f2ce3','super_admin' WHERE EXISTS(SELECT 1 FROM auth.users WHERE id='7bb0de54-c95c-4270-bfb4-f0af8a2f2ce3') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs(action,affected_table,record_id,details) VALUES('identity_migration','profiles','7bb0de54-c95c-4270-bfb4-f0af8a2f2ce3','{"by":"owner request","national_id_moved_from":"muigaid.gathia@gmail.com"}');

CREATE OR REPLACE FUNCTION public.protect_profile_position()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.position IS DISTINCT FROM OLD.position AND auth.uid() IS NOT NULL AND NOT public.is_national_admin()
    AND NOT EXISTS(SELECT 1 FROM public.membership_applications a WHERE a.applicant_user_id=OLD.id AND a.position IS NOT DISTINCT FROM NEW.position AND a.application_status IN ('pending','approved')) THEN
  RAISE EXCEPTION 'Leadership positions are assigned through the application workflow';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_profile_position BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_position();