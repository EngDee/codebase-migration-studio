# CCAK backend activation

## Guest checkout
- [x] Fix guest callback settlement with shared Safaricom verification and regression coverage for paid, failed, duplicate and rejected confirmations.
- [ ] Allow account-free checkout with private guest order status, receipts, payment requests and purchased downloads.
- [ ] Preserve server pricing, Fargo quote approval and test-only payments; test guest access without creating demo orders.

## Customer orders and digital materials
- [x] Add private customer order history/details, payment and delivery status, and branded printable receipts with the president's signature.
- [x] Add administrator-uploaded PDF study materials with paid, non-sandbox purchase download access and audited delivery tracking.
- [x] Run all 38 regression tests, verify schema and storage policies, and check signed-in order history and mobile layout without creating demonstration records.
- [ ] Verify actual receipt printing, material upload/download and delivery updates end-to-end: blocked by zero real orders/materials, sandbox-only payments and unavailable national-admin session. Upload the actual course PDFs and authorise live payments before paid downloads can operate.

## Harvest marketplace checkout
- [x] Activate persistent cart quantities, checkout subtotals, international shipping address, saved-order thank-you note and separate Daraja test payment flow.
- [x] Confirm product prices and test-only intent; use audited administrator-entered Fargo quotes before calculating physical-goods totals, never invented delivery fees.
- [x] Add private server-written shop order storage and independent callback verification without affecting membership contributions; all 33 regression tests pass, mobile checkout has no overflow and malformed callbacks return 400.
- [ ] Verify saved-order, administrator quote and successful Daraja payment end-to-end: blocked by no authorised real order/test transaction under the no-demonstration-records constraint and no available national-admin session.
- [ ] Automate Fargo shipping rates: requires Fargo's approved rate/API details and any contracted access; no verified public rate feed was found.

## Personal super-admin access
- [x] Reserve super-admin access for muigaid.gathia@gmail.com only after confirmed email ownership, preserving the association administrator.
- [x] Verify confirmed email eligibility, unconfirmed denial, unrelated email denial and association preservation through authenticated database calls; keep the regression check.
- [ ] Complete account registration, email confirmation and super-admin sign-in: blocked until the owner registers and confirms muigaid.gathia@gmail.com; no account exists yet and no password or confirmation was fabricated.

## Daraja sandbox check
- [x] Add an authenticated national-admin sandbox configuration check with clear results and no payment requests or member-record writes.
- [x] Test sandbox isolation, missing credentials, provider failures, token redaction and national-admin permissions; all 26 regression tests pass and preview build is OK.
- [ ] Exercise the check through the administration page: blocked because the requesting user's account has no national-admin role; authenticated navigation correctly redirects to membership, and the association account has no matching national-admin role.

## Combined GitHub compatibility
- [x] Repair synced payment and digital-card compatibility and safely apply pending payment storage.
- [x] Verify existing registration fields, public-form navigation, payment restrictions and website rendering; record external-service blockers in compatibility-stage-report.md.

## Membership identity registration
- [x] Add CCAK Member, gender, National ID and date of birth with secure persistent identity storage.
- [ ] Complete county/year approval verification and National ID primary-key replacement: blocked by missing verified identity data and no authorised test approval without demonstration records.

## Real website forms
- [x] Replace demo Join/Login actions and save Partner, Donate and Newsletter submissions through validated server functions.
- [x] Verify public form persistence, validation and mobile layout; document email-delivery limitations.

## Dependency security updates
- [x] Refresh vulnerable direct and transitive dependencies to the requested fixed versions without adding transitive overrides.
- [x] Verify locked versions, dependency scan, validation tests and preview build.

- [x] Extend the existing schema for applications, county-scoped roles, and audit trails without deleting records.
- [x] Implement validated, transactional submission, review, role assignment, and minimum-data verification.
- [x] Secure private supporting documents and preserve existing photo access.
- [x] Connect existing member submission and admin review to the secure workflow without redesigning pages.
- [x] Run read-access, permission-denial, validation and compatibility checks; store the stage report.
- [ ] Verify successful submission, duplicate prevention, approval, rejection, and card eligibility end-to-end: blocked by the no-demonstration-records requirement and no authorised approved member/payment to exercise.

## External activation blockers
- [ ] Activate and test live M-Pesa: requires Daraja credentials and confirmation of the contribution amount.
- [ ] Activate real phone/National ID ownership verification: requires a contracted KYC provider, not standard Daraja.
- [ ] Complete the card authorisation details: requires the president’s full name and signature image.
- [ ] Activate membership email notifications: requires a verified sending domain and email setup.

Later stages outside the completed form activation: full registration wizard, card downloads/QR display, announcements and report-export interfaces.