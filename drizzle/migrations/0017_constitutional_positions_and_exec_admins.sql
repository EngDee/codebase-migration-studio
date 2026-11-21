ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.membership_applications ADD COLUMN IF NOT EXISTS position text;

CREATE OR REPLACE FUNCTION public.is_valid_ccak_position(p text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT p IS NULL OR p = ANY(ARRAY['president','deputy_president','sec_gen','deputy_sec_gen','treasurer','nat_coordinator','director_rd','manager_marketing','manager_hr','exec_member','county_coordinator','county_sec','county_treasurer','county_youth_rep','county_women_rep','coffee_champion','coop_society_rep','ordinary_member'])
$$;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_position_valid CHECK (public.is_valid_ccak_position(position));
ALTER TABLE public.membership_applications ADD CONSTRAINT applications_position_valid CHECK (public.is_valid_ccak_position(position));

CREATE OR REPLACE FUNCTION public.is_confirmed_bootstrap_admin(account_email text, confirmed_at timestamp with time zone)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
 SELECT confirmed_at IS NOT NULL AND coalesce(lower(account_email) IN ('coffeechampionsassociation@gmail.com','muigaid.gathia@gmail.com','muigaid.paypal@gmail.com','president@coffeechampions.co.ke'), false)
$function$;

CREATE OR REPLACE FUNCTION public.submit_membership_registration(payload jsonb)
 RETURNS membership_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result public.membership_applications; pos text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to submit an application'; END IF;
 IF nullif(payload->>'national_id','') IS NULL OR nullif(payload->>'gender','') IS NULL OR nullif(payload->>'date_of_birth','') IS NULL THEN RAISE EXCEPTION 'National ID, gender and date of birth are required'; END IF;
 pos := CASE WHEN payload->>'member_type'='ccak_member' THEN nullif(payload->>'position','') ELSE NULL END;
 IF NOT public.is_valid_ccak_position(pos) THEN RAISE EXCEPTION 'Choose a valid constitutional position'; END IF;
 UPDATE public.profiles SET national_id=trim(payload->>'national_id'),gender=payload->>'gender',date_of_birth=(payload->>'date_of_birth')::date WHERE id=auth.uid();
 SELECT * INTO result FROM public.submit_membership_application(payload);
 UPDATE public.membership_applications SET position=pos WHERE id=result.id RETURNING * INTO result;
 UPDATE public.profiles SET position=pos WHERE id=auth.uid();
 RETURN result;
END $function$;