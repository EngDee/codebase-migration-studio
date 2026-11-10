CREATE TABLE public.guest_shop_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), guest_session_hash text NOT NULL CHECK (length(guest_session_hash)=64), request_key uuid NOT NULL UNIQUE,
 customer_name text NOT NULL, customer_email text NOT NULL, items jsonb NOT NULL, subtotal_kes integer NOT NULL CHECK(subtotal_kes>0), shipping_address jsonb, shipping_kes integer, shipping_quote_reference text, amount_kes integer, phone text,
 status text NOT NULL DEFAULT 'awaiting_quote' CHECK(status IN ('awaiting_quote','ready','pending','paid','failed')), payment_environment text NOT NULL DEFAULT 'sandbox' CHECK(payment_environment='sandbox'), checkout_request_id text UNIQUE, merchant_request_id text, mpesa_receipt text,
 created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz, delivery_status text NOT NULL DEFAULT 'not_dispatched' CHECK(delivery_status IN ('not_dispatched','preparing','dispatched','delivered')), tracking_reference text, delivery_updated_at timestamptz
);
GRANT SELECT ON public.guest_shop_orders TO authenticated;
GRANT ALL ON public.guest_shop_orders TO service_role;
ALTER TABLE public.guest_shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "National staff read guest orders" ON public.guest_shop_orders FOR SELECT TO authenticated USING(public.is_national_admin());
CREATE INDEX guest_orders_session_created ON public.guest_shop_orders(guest_session_hash,created_at);
CREATE OR REPLACE FUNCTION public.quote_guest_shop_delivery(order_id uuid, fee_kes integer, quote_reference text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_national_admin() THEN RAISE EXCEPTION 'National administrator required'; END IF;
 IF fee_kes IS NULL OR fee_kes<0 OR fee_kes>1000000 OR length(btrim(quote_reference)) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Invalid quote'; END IF;
 UPDATE public.guest_shop_orders SET shipping_kes=fee_kes,shipping_quote_reference=btrim(quote_reference),amount_kes=subtotal_kes+fee_kes,status='ready' WHERE id=order_id AND status='awaiting_quote';
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not awaiting quote'; END IF;
 INSERT INTO public.audit_logs(user_id,action,affected_table,record_id,details) VALUES(auth.uid(),'quote_guest_delivery','guest_shop_orders',order_id,jsonb_build_object('fee',fee_kes,'reference',quote_reference));
END $$;
REVOKE ALL ON FUNCTION public.quote_guest_shop_delivery(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.quote_guest_shop_delivery(uuid,integer,text) TO authenticated;