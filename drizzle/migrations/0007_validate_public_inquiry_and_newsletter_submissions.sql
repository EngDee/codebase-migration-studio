ALTER POLICY "Anyone can subscribe" ON public.newsletter_subscribers
WITH CHECK (
  char_length(email) BETWEEN 3 AND 255
  AND email = btrim(email)
  AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  AND subscription_status = 'active'
);

ALTER POLICY "Anyone can submit inquiries" ON public.inquiries
WITH CHECK (
  kind IN ('partner', 'donate')
  AND char_length(btrim(full_name)) BETWEEN 1 AND 120
  AND char_length(full_name) <= 120
  AND char_length(email) BETWEEN 3 AND 255
  AND email = btrim(email)
  AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  AND (phone IS NULL OR char_length(phone) <= 20)
  AND (county IS NULL OR char_length(county) <= 40)
  AND (message IS NULL OR char_length(message) <= 1000)
  AND status = 'new'
);

-- Public submitters supply form fields only. IDs, timestamps, generated
-- inquiry type and administrative statuses must use database defaults.
REVOKE INSERT ON public.newsletter_subscribers FROM anon, authenticated;
GRANT INSERT (email) ON public.newsletter_subscribers TO anon, authenticated;
REVOKE INSERT ON public.inquiries FROM anon, authenticated;
GRANT INSERT (kind, full_name, email, phone, county, message) ON public.inquiries TO anon, authenticated;