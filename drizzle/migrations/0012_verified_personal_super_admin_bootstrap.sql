CREATE OR REPLACE FUNCTION public.is_confirmed_bootstrap_admin(account_email text, confirmed_at timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT confirmed_at IS NOT NULL AND coalesce(lower(account_email) IN ('coffeechampionsassociation@gmail.com','muigaid.gathia@gmail.com'), false)
$$;
REVOKE ALL ON FUNCTION public.is_confirmed_bootstrap_admin(text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_confirmed_bootstrap_admin(text,timestamptz) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(id,email,full_name,phone) VALUES(NEW.id,NEW.email,left(NEW.raw_user_meta_data->>'full_name',120),left(coalesce(NEW.phone,NEW.raw_user_meta_data->>'phone'),20));
 INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'member');
 IF public.is_confirmed_bootstrap_admin(NEW.email, NEW.email_confirmed_at) THEN
  INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'super_admin') ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.assign_confirmed_association_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF public.is_confirmed_bootstrap_admin(NEW.email, NEW.email_confirmed_at) THEN
  INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'super_admin') ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user(), public.assign_confirmed_association_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user(), public.assign_confirmed_association_admin() TO service_role;