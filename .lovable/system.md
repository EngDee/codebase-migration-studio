# CCAK library setup

Import the library entry to load its CCAK brand stylesheet. It includes locally bundled Inter and Montserrat variable fonts through relative URLs under `src/assets/fonts/`; no Google Fonts document-head links are required for consumers. Keep font assets and their SIL Open Font License files together when copying the library. Do not replace the brand typefaces with approximations.

Use the existing CCAK design tokens and component APIs; do not invent payment status or pricing. Membership documents receive owner-authorized data only. Active cards and paid receipts require server-confirmed production payment; test and unverified payments are not proof of payment.