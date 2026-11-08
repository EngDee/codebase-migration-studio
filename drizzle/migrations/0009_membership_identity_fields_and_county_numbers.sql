ALTER TABLE public.profiles ADD COLUMN national_id text;
ALTER TABLE public.profiles ADD COLUMN gender text;
ALTER TABLE public.profiles ADD COLUMN date_of_birth date;
CREATE UNIQUE INDEX profiles_national_id_unique ON public.profiles(national_id) WHERE national_id IS NOT NULL;
COMMENT ON COLUMN public.profiles.national_id IS 'Unique membership identity. Intended future primary key after verified National ID collection and dependent key migration; UUID account primary key is retained during transition.';
ALTER TABLE public.membership_applications ADD COLUMN national_id text;
ALTER TABLE public.membership_applications ADD COLUMN gender text;
ALTER TABLE public.membership_applications ADD COLUMN date_of_birth date;
CREATE TABLE public.membership_county_codes (county text PRIMARY KEY, code text NOT NULL UNIQUE);
GRANT SELECT ON public.membership_county_codes TO authenticated;
GRANT ALL ON public.membership_county_codes TO service_role;
ALTER TABLE public.membership_county_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in users read CCAK county codes" ON public.membership_county_codes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TABLE public.membership_number_counters (county text NOT NULL REFERENCES public.membership_county_codes(county), registration_year integer NOT NULL, last_number bigint NOT NULL DEFAULT 0, PRIMARY KEY(county,registration_year));
GRANT ALL ON public.membership_number_counters TO service_role;
ALTER TABLE public.membership_number_counters ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX profiles_member_number_secondary ON public.profiles(member_no) WHERE member_no IS NOT NULL;
CREATE OR REPLACE FUNCTION public.ccak_county_code(county_name text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE county_name WHEN 'Baringo' THEN 'BAR' WHEN 'Bomet' THEN 'BOM' WHEN 'Bungoma' THEN 'BUN' WHEN 'Busia' THEN 'BUS' WHEN 'Elgeyo-Marakwet' THEN 'ELM' WHEN 'Embu' THEN 'EMB' WHEN 'Garissa' THEN 'GAR' WHEN 'Homa Bay' THEN 'HOM' WHEN 'Isiolo' THEN 'ISI' WHEN 'Kajiado' THEN 'KAJ' WHEN 'Kakamega' THEN 'KAK' WHEN 'Kericho' THEN 'KER' WHEN 'Kiambu' THEN 'KIA' WHEN 'Kilifi' THEN 'KIL' WHEN 'Kirinyaga' THEN 'KIR' WHEN 'Kisii' THEN 'KIS' WHEN 'Kisumu' THEN 'KSM' WHEN 'Kitui' THEN 'KIT' WHEN 'Kwale' THEN 'KWA' WHEN 'Laikipia' THEN 'LAI' WHEN 'Lamu' THEN 'LAM' WHEN 'Machakos' THEN 'MAC' WHEN 'Makueni' THEN 'MAK' WHEN 'Mandera' THEN 'MAN' WHEN 'Marsabit' THEN 'MAR' WHEN 'Meru' THEN 'MER' WHEN 'Migori' THEN 'MIG' WHEN 'Mombasa' THEN 'MOM' WHEN 'Murang''a' THEN 'MUR' WHEN 'Nairobi' THEN 'NAI' WHEN 'Nakuru' THEN 'NAK' WHEN 'Nandi' THEN 'NAN' WHEN 'Narok' THEN 'NAR' WHEN 'Nyamira' THEN 'NYM' WHEN 'Nyandarua' THEN 'NYA' WHEN 'Nyeri' THEN 'NYE' WHEN 'Samburu' THEN 'SAM' WHEN 'Siaya' THEN 'SIA' WHEN 'Taita-Taveta' THEN 'TAT' WHEN 'Tana River' THEN 'TAR' WHEN 'Tharaka-Nithi' THEN 'THN' WHEN 'Trans Nzoia' THEN 'TRN' WHEN 'Turkana' THEN 'TUR' WHEN 'Uasin Gishu' THEN 'UAG' WHEN 'Vihiga' THEN 'VIH' WHEN 'Wajir' THEN 'WAJ' WHEN 'West Pokot' THEN 'WEP' END
$$;
REVOKE ALL ON FUNCTION public.ccak_county_code(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ccak_county_code(text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.validate_membership_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.national_id IS NOT NULL AND NEW.national_id !~ '^[0-9]{6,10}$' THEN RAISE EXCEPTION 'Enter a valid National ID (6 to 10 digits)'; END IF;
 IF NEW.gender IS NOT NULL AND NEW.gender NOT IN ('female','male','other','prefer_not_to_say') THEN RAISE EXCEPTION 'Choose a valid gender option'; END IF;
 IF NEW.date_of_birth IS NOT NULL AND (NEW.date_of_birth >= (now() AT TIME ZONE 'Africa/Nairobi')::date OR NEW.date_of_birth < DATE '1900-01-01') THEN RAISE EXCEPTION 'Enter a valid date of birth'; END IF;
 IF TG_OP='UPDATE' AND (NEW.national_id IS DISTINCT FROM OLD.national_id OR NEW.gender IS DISTINCT FROM OLD.gender OR NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth) AND OLD.national_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.membership_applications WHERE applicant_user_id=OLD.id) THEN RAISE EXCEPTION 'Contact the association to correct submitted identity details'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_membership_identity BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_membership_identity();
CREATE OR REPLACE FUNCTION public.snapshot_membership_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.profiles;
BEGIN
 SELECT * INTO p FROM public.profiles WHERE id=NEW.applicant_user_id FOR UPDATE;
 IF p.national_id IS NULL OR p.gender IS NULL OR p.date_of_birth IS NULL THEN RAISE EXCEPTION 'National ID, gender and date of birth are required'; END IF;
 NEW.national_id := p.national_id; NEW.gender := p.gender; NEW.date_of_birth := p.date_of_birth;
 RETURN NEW;
END $$;
CREATE TRIGGER snapshot_membership_identity BEFORE INSERT ON public.membership_applications FOR EACH ROW EXECUTE FUNCTION public.snapshot_membership_identity();
CREATE OR REPLACE FUNCTION public.submit_membership_registration(payload jsonb) RETURNS public.membership_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.membership_applications;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to submit an application'; END IF;
 IF nullif(payload->>'national_id','') IS NULL OR nullif(payload->>'gender','') IS NULL OR nullif(payload->>'date_of_birth','') IS NULL THEN RAISE EXCEPTION 'National ID, gender and date of birth are required'; END IF;
 UPDATE public.profiles SET national_id=trim(payload->>'national_id'),gender=payload->>'gender',date_of_birth=(payload->>'date_of_birth')::date WHERE id=auth.uid();
 SELECT * INTO result FROM public.submit_membership_application(payload);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.submit_membership_registration(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_membership_registration(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.format_ccak_member_number(county_code text, registration_year integer, registration_number bigint) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
BEGIN
 IF county_code IS NULL OR county_code !~ '^[A-Z]{3}$' OR registration_year NOT BETWEEN 2000 AND 2099 OR registration_number < 1 OR registration_number IS NULL THEN RAISE EXCEPTION 'Invalid membership number components'; END IF;
 RETURN 'CCAK/' || county_code || '/' || right(registration_year::text,2) || '/' || lpad(registration_number::text,greatest(3,length(registration_number::text)),'0');
END $$;
REVOKE ALL ON FUNCTION public.format_ccak_member_number(text,integer,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.format_ccak_member_number(text,integer,bigint) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.assign_county_member_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.membership_applications; code text; year_value integer; next_number bigint;
BEGIN
 IF NEW.status='approved' AND OLD.member_no IS NULL AND NEW.member_no IS NOT NULL THEN
  SELECT * INTO a FROM public.membership_applications WHERE applicant_user_id=OLD.id AND application_status='approved' AND reviewed_by=auth.uid() AND reviewed_at=NEW.reviewed_at;
  IF NOT FOUND OR NOT public.can_review_county(a.county) THEN RAISE EXCEPTION 'Membership number requires an authorised approval'; END IF;
  code := public.ccak_county_code(a.county);
  year_value := extract(year FROM a.submission_date AT TIME ZONE 'Africa/Nairobi')::integer;
  INSERT INTO public.membership_county_codes(county,code) VALUES(a.county,code) ON CONFLICT(county) DO NOTHING;
  INSERT INTO public.membership_number_counters(county,registration_year,last_number) VALUES(a.county,year_value,1) ON CONFLICT(county,registration_year) DO UPDATE SET last_number=membership_number_counters.last_number+1 RETURNING last_number INTO next_number;
  NEW.member_no := public.format_ccak_member_number(code,year_value,next_number);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_assign_county_member_number BEFORE UPDATE OF member_no ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.assign_county_member_number();
REVOKE ALL ON FUNCTION public.validate_membership_identity(),public.snapshot_membership_identity(),public.assign_county_member_number() FROM PUBLIC,anon,authenticated;