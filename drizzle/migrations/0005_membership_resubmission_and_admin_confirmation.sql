CREATE OR REPLACE FUNCTION public.protect_profile_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE is_submission boolean;
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'Profile identity cannot change'; END IF;
 NEW.email := OLD.email;
 is_submission := NEW.submitted_at IS DISTINCT FROM OLD.submitted_at AND EXISTS(SELECT 1 FROM public.membership_applications a WHERE a.applicant_user_id=OLD.id AND a.submission_date=NEW.submitted_at AND a.application_status='pending' AND a.reviewed_by IS NULL);
 IF NEW.status IS DISTINCT FROM OLD.status OR NEW.member_no IS DISTINCT FROM OLD.member_no OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
  IF NOT (is_submission AND NEW.status='pending' AND NEW.reviewed_at IS NULL AND NEW.member_no IS NOT DISTINCT FROM OLD.member_no) AND NOT (public.can_review_county(OLD.county) AND EXISTS(SELECT 1 FROM public.membership_applications a WHERE a.applicant_user_id=OLD.id AND a.application_status=NEW.status AND a.reviewed_by=auth.uid() AND a.reviewed_at=NEW.reviewed_at)) THEN RAISE EXCEPTION 'Membership decisions must use the authorised review workflow'; END IF;
 END IF;
 IF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at AND NOT is_submission THEN RAISE EXCEPTION 'Submission timestamp is managed by the application workflow'; END IF;
 IF is_submission THEN NEW.status := 'pending'; NEW.reviewed_at := NULL; END IF;
 NEW.updated_at := now(); RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(id,email,full_name,phone) VALUES(NEW.id,NEW.email,left(NEW.raw_user_meta_data->>'full_name',120),left(coalesce(NEW.phone,NEW.raw_user_meta_data->>'phone'),20));
 INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'member');
 IF lower(NEW.email)='coffeechampionsassociation@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'super_admin') ON CONFLICT DO NOTHING; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.assign_confirmed_association_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email)='coffeechampionsassociation@gmail.com' THEN INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'super_admin') ON CONFLICT DO NOTHING; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER association_admin_email_confirmed AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_confirmed_association_admin();