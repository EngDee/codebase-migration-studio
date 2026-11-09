# Combined change compatibility report

## Included changes
- The locally available synced revision includes GitHub commits `5e7a15e` (payment/card portal wiring), `1ac2bd2` (Daraja, identity and card additions), and `a36ed3b` (identity fields and county codes). No remote branch was pulled or switched; updates on other branches must be merged into the synced branch by the repository owner.
- Replaced the unsupported legacy payment API route with TanStack route handlers and added the public payment callback endpoint.
- Activated contribution storage and regenerated its types. The GitHub SQL file was not journaled/applied; the generated secure migration now supplies the missing storage without deleting the original file.
- Removed invalid optional-property and response-type assumptions that prevented compilation.
- Kept contribution writes server-controlled. Members have SELECT only; neither INSERT nor UPDATE privileges are granted.
- A callback now requires independent Safaricom query confirmation, matching request identifiers, amount and phone before a paid result is recorded. Invalid callbacks cannot unlock a card.
- Card eligibility requires approved membership, an issued membership number and a confirmed payment. Provider rejection no longer falls back to local success.
- Added the official logo and logo watermark to the existing card, removed the nonexistent QR claim, and delivered the configured signatory name through the server rather than browser environment access.
- Corrected portal branding contrast and checkbox sizing; preserved the existing site layout.

## Verification
- All 17 tests passed, covering registration validation, existing public-form validation, routing and payment rules.
- Automated preview checks reported build OK after compatibility repairs.
- Signed in using the requesting user’s existing account: membership loaded, with National ID, gender, date of birth and CCAK Member available.
- Join opens account registration; the Partner form opens on mobile. No horizontal overflow at 390px. No browser runtime errors observed.
- Malformed callback returned HTTP 400.
- Live database inspection confirmed contribution storage exists and members can read but cannot insert or update payment rows.
- No member records or demonstration submissions were created or altered during verification.

## Not activated or not verified
- Live STK payment and successful callback: no Daraja credentials are configured. KES 500 is an existing code default, not a user-confirmed fee.
- Real phone-to-National-ID ownership verification: standard Daraja does not provide this; the current check compares entered values with the membership record only. A contracted provider and provider-specific validation are still required.
- President’s real full name/signature were not supplied. Existing card objectives/motto are provisional copy from the GitHub addition, not confirmed association text. National ID remains masked on the card.
- Successful registration/review/number allocation/card display through a paid approved account were not exercised: the existing account is unsubmitted, and the project prohibits demonstration records. Existing approval numbering logic was preserved, not rewritten based on a speculative audit concern.
- National ID is unique but not the relational primary key; UUID links remain until real identity data and a verified additive migration permit replacement safely.
- Card exports and public QR verification are not added by this compatibility pass.
- Membership notification emails still require verified sending-domain setup.