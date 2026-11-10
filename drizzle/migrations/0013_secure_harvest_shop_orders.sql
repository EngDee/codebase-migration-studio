CREATE TABLE public.shop_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id), request_key uuid NOT NULL UNIQUE,
 items jsonb NOT NULL, subtotal_kes integer NOT NULL CHECK(subtotal_kes>0), shipping_address jsonb,
 shipping_kes integer CHECK(shipping_kes>=0), shipping_quote_reference text,
 amount_kes integer, phone text, status text NOT NULL DEFAULT 'awaiting_quote' CHECK(status IN ('awaiting_quote','ready','pending','paid','failed')),
 payment_environment text NOT NULL DEFAULT 'sandbox' CHECK(payment_environment='sandbox'), checkout_request_id text UNIQUE, merchant_request_id text, mpesa_receipt text,
 created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz
);
GRANT SELECT ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read shop orders" ON public.shop_orders FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "National administrators read shop orders" ON public.shop_orders FOR SELECT TO authenticated USING(public.is_national_admin());
CREATE OR REPLACE FUNCTION public.quote_shop_delivery(order_id uuid, fee_kes integer, quote_reference text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_national_admin() THEN RAISE EXCEPTION 'National administrator access required'; END IF;
 IF fee_kes IS NULL OR fee_kes<0 OR fee_kes>1000000 OR quote_reference IS NULL OR length(trim(quote_reference))<3 OR length(quote_reference)>200 THEN RAISE EXCEPTION 'Valid Fargo quote required'; END IF;
 UPDATE public.shop_orders SET shipping_kes=fee_kes, shipping_quote_reference=trim(quote_reference), amount_kes=subtotal_kes+fee_kes, status='ready' WHERE id=order_id AND status='awaiting_quote';
 IF NOT FOUND THEN RAISE EXCEPTION 'Order is not awaiting a quote'; END IF;
 INSERT INTO public.audit_logs(user_id,action,affected_table,record_id,details) VALUES(auth.uid(),'delivery_quote','shop_orders',order_id,jsonb_build_object('fee_kes',fee_kes,'quote_reference',quote_reference));
END $$;
REVOKE ALL ON FUNCTION public.quote_shop_delivery(uuid,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quote_shop_delivery(uuid,integer,text) TO authenticated;