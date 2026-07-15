# Changelog

## 0.3.0

- Added public charity and community-organisation registration
- Replaced the shared coordinator password with individual email/password owner accounts
- Added scrypt password hashing and signed organisation-scoped sessions
- Added `organisations` and `coordinators` database tables
- Added `organisation_id` isolation to volunteers, shifts, claim tokens, notifications and audit events
- Updated broadcasts and successful claim notifications to use the owning organisation
- Added password and session security tests
- Updated deployment, architecture and security documentation for multi-tenant use

## 0.2.0

- Added coordinator login and signed server-side session cookie
- Added coordinator dashboard, shift creation and volunteer management
- Added volunteer and coordinator confirmation emails after a successful claim
- Added audit event and notification delivery records
- Added input validation, health endpoint and same-origin checks
- Added unit tests, concurrency test script and CI workflow
- Expanded product, architecture, security, testing and impact documentation

## 0.1.0

- Initial database schema
- Race-safe `claim_shift` PostgreSQL function
- Email broadcast endpoint
- Volunteer claim confirmation flow
