-- Member contribution payments (M-Pesa) that unlock the digital membership card.
CREATE TABLE IF NOT EXISTS public.member_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_kes integer NOT NULL CHECK (amount_kes >= 1),
  phone text NOT NULL,
  national_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  account_reference text,
  checkout_request_id text,
  merchant_request_id text,
  mpesa_receipt text,
  result_desc text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_contributions_user_idx
  ON public.member_contributions (member_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS member_contributions_checkout_idx
  ON public.member_contributions (checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

ALTER TABLE public.member_contributions ENABLE ROW LEVEL SECURITY;

-- Members read only their own rows
CREATE POLICY "Members read own contributions"
  ON public.member_contributions FOR SELECT TO authenticated
  USING (member_user_id = auth.uid());

-- Members insert their own pending contribution
CREATE POLICY "Members insert own pending contribution"
  ON public.member_contributions FOR INSERT TO authenticated
  WITH CHECK (
    member_user_id = auth.uid()
    AND status = 'pending'
  );

-- Members may update limited fields on their own pending rows (e.g. attach checkout ids)
CREATE POLICY "Members update own pending contribution metadata"
  ON public.member_contributions FOR UPDATE TO authenticated
  USING (member_user_id = auth.uid())
  WITH CHECK (member_user_id = auth.uid());

-- Staff (national / super) can read all for reconciliation
CREATE POLICY "National staff read all contributions"
  ON public.member_contributions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin', 'national_admin')
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.member_contributions TO authenticated;
GRANT ALL ON public.member_contributions TO service_role;

COMMENT ON TABLE public.member_contributions IS
  'M-Pesa contribution payments that unlock the CCAK digital membership card after successful STK Push.';
