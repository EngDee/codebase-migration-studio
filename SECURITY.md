# Security notes – CCAK / Codebase Migration Studio

## Secrets & environment

- **Never commit `.env`**. It is listed in `.gitignore`.
- Use `.env.example` as a template.
- The **service role key** (`SUPABASE_SERVICE_ROLE_KEY`) must only exist in the server environment. Never prefix it with `VITE_` and never import `client.server.ts` into client bundles.
- Publishable / anon keys are intentionally public (browser-safe) but should still not be committed if avoidable.

## Authorization model

- Client-side route guards (`/_authenticated`) are UX only.
- All privileged data access and mutations go through TanStack server functions protected by `requireSupabaseAuth` middleware **and** database RLS / SECURITY DEFINER functions.
- Role assignment and membership decisions are enforced inside Postgres RPCs, not only in the UI.

## Public forms

- Newsletter and inquiry inserts are limited by column-level grants and CHECK constraints.
- A honeypot field (`company_website`) is validated to be empty.
- A simple in-memory rate limiter (IP-based when headers are available) is applied in `savePublicForm`. For multi-instance production replace with Redis / Cloudflare / Edge rate limiting.

## Headers

- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are applied in `src/server.ts`.
- Review and tighten the CSP once the exact set of third-party origins is known.

## Recommended production checklist

1. Remove any committed `.env` from Git history and rotate keys if the repo was public.
2. Configure a verified sending domain for Auth emails (confirmation, password reset).
3. Create and secure the first `super_admin` account via the association email confirmation path.
4. Enable Supabase Auth email confirmation and review OAuth redirect URIs.
5. Add external rate limiting / bot protection (Cloudflare Turnstile or similar) for public forms.
6. Enable database backups and test restore.
7. Periodically audit `pg_policies` and new migrations.
8. Keep dependencies updated (`npm audit` / Dependabot).

## Reporting issues

Contact the association administrators. Do not open public issues that contain sensitive details.
