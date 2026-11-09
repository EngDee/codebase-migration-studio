CREATE TABLE IF NOT EXISTS public.member_contributions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 amount_kes integer NOT NULL CHECK(amount_kes >= 1), phone text NOT NULL CHECK(phone ~ '^254[17][0-9]{8}$'), national_id text NOT NULL CHECK(national_id ~ '^[0-9]{6,10}$'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','cancelled')), account_reference text, checkout_request_id text, merchant_request_id text, mpesa_receipt text, result_desc text, paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.member_contributions TO authenticated;
GRANT ALL ON public.member_contributions TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.member_contributions FROM authenticated, anon;
ALTER TABLE public.member_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members insert own pending contribution" ON public.member_contributions;
DROP POLICY IF EXISTS "Members update own pending contribution metadata" ON public.member_contributions;
DROP POLICY IF EXISTS "Members read own contributions" ON public.member_contributions;
CREATE POLICY "Members read own contributions" ON public.member_contributions FOR SELECT TO authenticated USING(member_user_id = auth.uid());
DROP POLICY IF EXISTS "National staff read all contributions" ON public.member_contributions;
CREATE POLICY "National staff read all contributions" ON public.member_contributions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'national_admin'));
CREATE INDEX IF NOT EXISTS member_contributions_user_idx ON public.member_contributions(member_user_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS member_contributions_checkout_unique ON public.member_contributions(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
COMMENT ON TABLE public.member_contributions IS 'Server-controlled M-Pesa contributions. Members can read but cannot create or forge payment status.';