CREATE TABLE public.crypto_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  purpose text NOT NULL CHECK (purpose IN ('donation','shop_order','membership','academy')),
  reference text,
  payer_name text, payer_contact text,
  asset_id text NOT NULL CHECK (asset_id IN ('USDT_TRC20','BTC','ETH','SOL','WLD','TRX','DOGE')),
  wallet_address text NOT NULL,
  amount_kes integer NOT NULL CHECK (amount_kes BETWEEN 10 AND 10000000),
  amount_crypto_approx text,
  txid text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  review_note text, reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, txid)
);
GRANT SELECT ON public.crypto_payments TO authenticated;
GRANT ALL ON public.crypto_payments TO service_role;
ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and national admins read crypto payments" ON public.crypto_payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_national_admin());

CREATE OR REPLACE FUNCTION public.submit_crypto_payment(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a text := payload->>'asset_id'; t text := btrim(coalesce(payload->>'txid','')); w text; new_id uuid;
BEGIN
  w := CASE a WHEN 'USDT_TRC20' THEN 'TN4iogXCAmnj7GTvk7ik4qVNomNxKndgYB' WHEN 'TRX' THEN 'TN4iogXCAmnj7GTvk7ik4qVNomNxKndgYB'
    WHEN 'BTC' THEN '16KqnZS5MFhXjz88o4d4beqJuL86j3rHi5' WHEN 'ETH' THEN '0x7ad2be8a93fe3aa17cd7a83b9cacb252328e0ece'
    WHEN 'WLD' THEN '0x7ad2be8a93fe3aa17cd7a83b9cacb252328e0ece' WHEN 'SOL' THEN 'ExNTk5YugKW4vtfts3MxBzfWDigTjJJUpBgmAufW6i1H'
    WHEN 'DOGE' THEN 'DRcaswaoajD5JK9nhtsjTLSqfFZDHC3vv3' END;
  IF w IS NULL THEN RAISE EXCEPTION 'Choose a supported coin'; END IF;
  IF t !~ '^(0x)?[A-Za-z0-9]{40,120}$' THEN RAISE EXCEPTION 'Enter the full transaction ID (hash) from your wallet'; END IF;
  IF coalesce(payload->>'purpose','') NOT IN ('donation','shop_order','membership','academy') THEN RAISE EXCEPTION 'Invalid payment purpose'; END IF;
  INSERT INTO public.crypto_payments(user_id,purpose,reference,payer_name,payer_contact,asset_id,wallet_address,amount_kes,amount_crypto_approx,txid)
  VALUES (auth.uid(), payload->>'purpose', left(payload->>'reference',80), left(btrim(payload->>'payer_name'),120), left(btrim(payload->>'payer_contact'),160), a, w,
    (payload->>'amount_kes')::integer, left(payload->>'amount_crypto_approx',40), t)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('id', new_id, 'status', 'pending');
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'This transaction ID has already been submitted';
END $$;

CREATE OR REPLACE FUNCTION public.review_crypto_payment(payment_id uuid, decision text, note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_national_admin() THEN RAISE EXCEPTION 'National administrator required'; END IF;
  IF decision NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'Choose verified or rejected'; END IF;
  IF decision = 'rejected' AND coalesce(length(btrim(note)),0) = 0 THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;
  UPDATE public.crypto_payments SET status = decision, review_note = nullif(btrim(note),''), reviewed_by = auth.uid(), reviewed_at = now() WHERE id = payment_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment is not pending'; END IF;
  INSERT INTO public.audit_logs(user_id,action,affected_table,record_id,details) VALUES(auth.uid(),'crypto_' || decision,'crypto_payments',payment_id,jsonb_build_object('note',note));
END $$;
REVOKE ALL ON FUNCTION public.submit_crypto_payment, public.review_crypto_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_crypto_payment TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_crypto_payment TO authenticated;