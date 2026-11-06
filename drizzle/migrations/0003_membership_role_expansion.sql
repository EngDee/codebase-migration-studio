ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'national_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'county_admin';