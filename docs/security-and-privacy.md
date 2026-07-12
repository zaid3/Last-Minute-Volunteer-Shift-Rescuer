# Security and privacy

## Personal data

The application stores volunteer name, email address, active status and shift-assignment history. Deploying organisations must establish a lawful basis, privacy notice, retention period and deletion process appropriate to their jurisdiction.

## Controls implemented

- service-role database access is restricted to server code
- Row Level Security is enabled on all application tables
- coordinator sessions use HttpOnly, Secure-in-production, SameSite=Strict cookies
- state-changing coordinator form requests require a same-origin request
- claim tokens are random UUIDs and expire when the shift starts
- volunteer claims require POST and are never executed on link GET
- database row locking prevents duplicate successful claims
- audit records capture operational events without storing email content
- environment secrets are excluded from source control

## Known limitations

- the MVP uses one shared coordinator credential
- in-memory or edge-level rate limiting is not yet implemented
- audit records are not tamper-evident
- the application has not undergone independent penetration testing
- data retention is documented but not yet automated

These limitations must be addressed before broad or multi-organisation deployment.
