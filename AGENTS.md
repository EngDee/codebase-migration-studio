<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Membership backend
- Bootstrap administrator grants use a restricted database email-and-confirmation predicate in both signup and confirmation triggers; never use editable metadata or client checks, so unverified registrations cannot gain control.
- Keep membership applications as immutable submission snapshots; use authenticated database RPCs for atomic submission and review so profile status and audit history cannot diverge.
- Preserve the legacy admin role as full-control compatibility while supporting national and county-scoped roles; assign privileged roles only through verified database permissions.
- Keep server-function wrappers in src/lib and enforce authorization again in database functions and RLS; never rely on page visibility for security.
- Collect identity fields through the transactional registration RPC and immutable application snapshots; retain account UUID links until verified identity data permits a full key migration, so existing sign-in and submissions remain intact.
- Allocate member numbers through a database-locked county/year counter on authorised approval and a unique profile index; formatting and county mappings live in database functions to prevent concurrent collisions.

## Public form submissions
- Keep anonymous newsletter and inquiry inserts limited to form-input columns with validating RLS predicates; database defaults own administrative fields so public callers cannot forge status, identifiers or timestamps.
- Homepage forms share browser-safe validation schemas and submit through public server functions using the publishable client with insert-only RLS; acknowledge success only after the database confirms the write.

## Contributions
- Sandbox diagnostics are national-admin-only and use only a fixed sandbox OAuth GET with redirects blocked; never issue STK requests or write payment records, so checks cannot charge members.
- Keep contribution writes server-only after authenticated membership checks; members receive read-only access so payment status cannot be forged.
- Use a public TanStack callback route and independently query Daraja before updating a matched payment; callbacks alone do not establish payment authenticity.
- Read configurable card signatory details inside authenticated server handlers, never from browser process.env; external KYC rejection must not fall back to a local success.
