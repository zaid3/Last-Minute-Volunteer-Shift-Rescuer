# Security and privacy

## Personal data

The application stores organisation names and contact emails, coordinator names and account emails, and volunteer names, email addresses, active status and shift-assignment history. Deploying organisations must establish a lawful basis, privacy notice, retention period and deletion process appropriate to their jurisdiction.

## Controls implemented

- service-role database access is restricted to server code
- Row Level Security is enabled on all application tables with no browser-facing policies
- coordinator passwords are stored as salted scrypt hashes
- coordinator sessions use signed HttpOnly, Secure-in-production, SameSite=Strict cookies
- coordinator sessions contain the authenticated organisation ID
- coordinator reads and writes are filtered by that organisation ID
- operational records store `organisation_id`
- state-changing coordinator form requests require a same-origin request
- claim tokens are random UUIDs and expire when the shift starts
- volunteer claims require POST and are never executed on link GET
- the database claim function verifies token, volunteer and shift organisation ownership
- database row locking prevents duplicate successful claims
- audit records capture operational events without storing email content
- environment secrets are excluded from source control

## Known limitations

- email verification and password reset are not yet implemented
- login and registration rate limiting is not yet implemented
- owner invitation, offboarding and session revocation are not yet implemented
- audit records are not tamper-evident
- the application has not undergone independent penetration testing
- data retention and organisation deletion are documented but not yet automated

These limitations must be addressed before broad production deployment with real personal data.
