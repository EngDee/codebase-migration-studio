# CCAK real forms stage

## Implemented
- Join CCAK and Create your account open real account registration; Member login opens sign-in.
- Partner and Donate save inquiries through a server function to the existing inquiries table.
- Newsletter saves addresses to the existing newsletter_subscribers table.
- Shared schemas validate browser and server inputs; existing insert-only database policies remain enforced. Public callers cannot set administrative fields or read submissions.
- Forms show success only after a confirmed database write, preserve input after failure, and disable submission while saving.
- Removed the demo-form alert and note; added an inquiry message field and corrected phone layout overflow.

## Verification
- Browser submitted a temporary Partner inquiry, Donate inquiry and Newsletter subscription; each success displayed only after storage completed.
- Database reads confirmed all three rows with expected initial statuses. Each temporary row was deleted by its exact ID, and a subsequent read confirmed zero remaining verification entries.
- Join opened account registration. Phone layout checked at 390 × 844; page width was 390 with no horizontal overflow.
- Eight validation and routing regression tests passed. Automatic build passed.

## Limitations
- Submissions are stored in Lovable Cloud → Database → inquiries or newsletter_subscribers, and existing national-admin views list them.
- No association sending domain is configured, so owner email notifications and newsletter delivery are not enabled. Email sending needs a paid plan and a verified owned domain; after verification, notification templates and sends must be added.
- Donate currently records a donation inquiry; it does not process a payment.
- Membership approval testing still requires a real application and an authorised administrator. This stage does not implement marketplace checkout, QR card downloads, training records or announcements.