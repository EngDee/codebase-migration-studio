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
- Keep membership applications as immutable submission snapshots; use authenticated database RPCs for atomic submission and review so profile status and audit history cannot diverge.
- Preserve the legacy admin role as full-control compatibility while supporting national and county-scoped roles; assign privileged roles only through verified database permissions.
- Keep server-function wrappers in src/lib and enforce authorization again in database functions and RLS; never rely on page visibility for security.
