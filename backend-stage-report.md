# CCAK backend activation report

## Implemented
- Extended the existing database instead of rebuilding or duplicating existing tables.
- Added membership_applications and audit_logs with explicit grants, RLS, indexes, owner reads and county-scoped staff reads.
- Extended profiles with sub_county and read-only user_id/member_number aliases; extended user_roles with county and creation date, inquiries with inquiry_type/status and subscribers with subscription_status.
- Added super_admin, national_admin and county_admin roles, preserving legacy admin compatibility. County roles require an assigned county. Privileged role assignment is restricted to super administrators and audited.
- Added atomic application submission and review functions. Submission requires terms, validates counties and file ownership, creates a unique reference, and records an audit event. A unique partial index prevents multiple pending/approved applications for one member.
- Approval and rejection record reviewer and date, update profile status transactionally and audit the decision. Rejection requires a reason; self-review is prohibited. Sequence-based membership numbers avoid random-number collisions.
- Added a private supporting-documents bucket with a 5 MB single-file limit. Member uploads are isolated by owner folder; reviewers read only within their permitted scope. Documents referenced by an application cannot be deleted through the member delete policy.
- Added minimum-data approved-member verification and aggregate membership statistics database functions. Public callers do not gain private profile-table access.
- Connected the existing member form and admin review controls to authenticated server functions. Included optional supporting-document uploads, terms acceptance, application references and review feedback without redesigning pages.
- Secured association administrator provisioning so the configured association email must be confirmed before the new account receives super_admin.
- Existing records were inspected and preserved. No demonstration records were inserted, no existing records were modified, and no source files were deleted.

## Verified
- Both new tables and added role values exist in the live database; both new tables have RLS enabled. Supporting-documents is private.
- Five automated tests passed: terms acceptance, 47 valid counties, rejection reason, ordinary-member staff exclusion, and existing home routing.
- The existing real member loaded their stored profile through the authenticated server flow; the same profile loaded after refresh.
- A member trying to open /admin was redirected to /membership. Signing out and revisiting /membership led to /auth.
- Real authenticated database checks confirmed direct application insertion, self-promotion, submission without terms and unauthorised review were denied. The member could read only their own existing profile and no audit rows.
- Signed-out database checks returned no private profiles or audit records. An invalid membership number returned no verification result.
- Desktop and 390 px mobile membership views rendered; no horizontal overflow or browser runtime errors were observed.
- Latest available application build reports build OK.

## Incomplete or unverified
- No successful registration or application write was performed: the instructions prohibit demonstration records, and the only existing account has not submitted a real application. Successful submission, duplicate prevention under real writes, rejection/resubmission, approval/member-number issuance and document persistence are implemented but not end-to-end verified.
- No existing authorised admin account is available. Successful admin access, county-versus-national access with actual role-bearing sessions, and role assignment remain unverified. The confirmed association account must exist before those checks can run.
- New account creation, email confirmation, password reset delivery and Google provider configuration were not tested or inspected in hosted settings in this stage.
- The membership-terms checkbox enforces acceptance, but the association has not supplied the actual terms document; legal content was not invented.
- Homepage Join/Login routing, Partner/Donate and newsletter activation remain a later stage. Existing homepage demo messages and hardcoded operational figures have not been changed by this backend-only task.
- Full registration wizard, digital-card download/QR interface, public verification page, announcements, admin search/export and supporting-document review interfaces remain later-stage work. Database support alone does not make these features operational.
- Email notification delivery is not implemented; it still needs a configured association sending domain.

## Security observations
- Permissions are checked by authenticated server middleware and again by database functions/RLS, not by a role supplied from the frontend.
- Application snapshots cannot be directly inserted or edited through authenticated table grants. Status, member number and review timestamps cannot be directly changed outside the review workflow.
- Active application counties cannot be changed through ordinary profile edits, preventing county-scope manipulation.
- No service credentials were exposed or placed in application source.
- Public inquiry and newsletter insertion retain their existing access policies; abuse throttling and comprehensive security scanning were not implemented in this stage.

This is a completed backend implementation stage with limited verified flows, not a declaration that the entire national membership platform is operational.