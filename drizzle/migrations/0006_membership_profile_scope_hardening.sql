CREATE OR REPLACE FUNCTION public.protect_profile_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE is_submission boolean;
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'Profile identity cannot change'; END IF;
 NEW.email := OLD.email;
 IF NEW.sub_county IS NOT NULL AND length(NEW.sub_county)>80 THEN RAISE EXCEPTION 'Sub-county is too long'; END IF;
 IF NEW.photo_path IS NOT NULL AND (NEW.photo_path NOT LIKE NEW.id::text || '/%' OR NEW.photo_path LIKE '%..%') THEN RAISE EXCEPTION 'Photo must belong to this member'; END IF;
 is_submission := NEW.submitted_at IS DISTINCT FROM OLD.submitted_at AND EXISTS(SELECT 1 FROM public.membership_applications a WHERE a.applicant_user_id=OLD.id AND a.submission_date=NEW.submitted_at AND a.application_status='pending' AND a.reviewed_by IS NULL);
 IF NEW.county IS DISTINCT FROM OLD.county AND NOT is_submission AND EXISTS(SELECT 1 FROM public.membership_applications WHERE applicant_user_id=OLD.id AND application_status IN ('pending','approved')) THEN RAISE EXCEPTION 'Contact the association to change the county of an active membership application'; END IF;
 IF NEW.status IS DISTINCT FROM OLD.status OR NEW.member_no IS DISTINCT FROM OLD.member_no OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
  IF NOT (is_submission AND NEW.status='pending' AND NEW.reviewed_at IS NULL AND NEW.member_no IS NOT DISTINCT FROM OLD.member_no) AND NOT EXISTS(SELECT 1 FROM public.membership_applications a WHERE a.applicant_user_id=OLD.id AND a.application_status=NEW.status AND a.reviewed_by=auth.uid() AND a.reviewed_at=NEW.reviewed_at AND public.can_review_county(a.county)) THEN RAISE EXCEPTION 'Membership decisions must use the authorised review workflow'; END IF;
 END IF;
 IF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at AND NOT is_submission THEN RAISE EXCEPTION 'Submission timestamp is managed by the application workflow'; END IF;
 IF is_submission THEN NEW.status := 'pending'; NEW.reviewed_at := NULL; END IF;
 NEW.updated_at := now(); RETURN NEW;
END $$;