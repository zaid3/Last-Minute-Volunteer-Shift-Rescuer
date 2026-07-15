# Architecture

## System boundary

The platform supports multiple charities and community organisations. Each organisation has its own coordinator accounts, volunteers, shifts, claim tokens, notification records and audit events.

The application has three main user journeys:

- a charity owner registers an organisation and creates the first coordinator account
- an authenticated coordinator manages volunteers, creates shifts and broadcasts alerts inside that organisation
- a volunteer opens a unique link, reviews the shift and explicitly confirms availability

All database and email operations run on the server.

## Components

### Next.js application

Server-rendered pages provide registration, coordinator and volunteer interfaces. Route handlers validate requests, authenticate coordinators, apply organisation scope, execute database operations and send email.

### PostgreSQL through Supabase

PostgreSQL stores organisations, coordinators, volunteers, shifts, claim tokens, audit events and notification records. Operational tables include `organisation_id` and server queries always filter with the organisation ID stored in the signed coordinator session.

Row Level Security is enabled with no browser-facing access policies. The application uses the service role only on the server.

### Resend

Resend delivers shift alerts and claim confirmations. Delivery attempts are stored against the owning organisation without storing message bodies.

## Authentication

Each coordinator has an email address, a scrypt password hash, a role and an organisation ID. Successful login creates an eight-hour HttpOnly cookie containing coordinator ID, organisation ID, role and expiry. The payload is signed with HMAC-SHA256 using `MANAGER_SESSION_SECRET`.

The browser never receives password hashes, the Supabase service key or the session signing secret.

## Tenant isolation

Tenant isolation is applied at several layers:

1. Every operational database row contains `organisation_id`.
2. The signed coordinator session contains one `organisationId`.
3. Dashboard and route queries filter by that ID.
4. New volunteers, shifts, tokens, notifications and audit records are inserted with that ID.
5. The claim transaction verifies that token, volunteer and shift belong to the same organisation.
6. Browser and anonymous database roles have no table privileges.

The service role bypasses RLS, so organisation filtering in server routes is a critical security boundary and must be included in every new query.

## Claim transaction

1. The server receives a UUID token through POST.
2. `claim_shift(token)` locks and loads the token.
3. The function rejects missing, used or expired tokens.
4. PostgreSQL locks the related shift row with `FOR UPDATE`.
5. The function confirms token, volunteer and shift organisation IDs match.
6. If the shift is open, the function assigns the token owner and marks the token used.
7. If another transaction already claimed the shift, the function returns `already_claimed`.

The row lock is the serialization point. The assignment decision is made in one database transaction.

## Production hardening still required

Before broad public use, add email verification, password reset, rate limiting, coordinator invitations, account recovery, organisation deletion, data-retention automation and central monitoring.
