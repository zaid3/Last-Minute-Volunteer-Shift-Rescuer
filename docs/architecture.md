# Architecture

## System boundary

The application has two user journeys:

- a coordinator authenticates, creates a shift, manages volunteers and broadcasts an alert
- a volunteer opens a unique link, reviews the shift and explicitly confirms availability

All database and email operations run on the server.

## Components

### Next.js application

Server-rendered pages provide the coordinator and volunteer interfaces. Route handlers validate requests, execute database operations and send email.

### PostgreSQL through Supabase

PostgreSQL stores volunteers, shifts, claim tokens, audit events and notification records. Row Level Security is enabled with no browser-facing access policies. The application uses the service role only on the server.

### Resend

Resend delivers shift alerts and claim confirmations. Delivery attempts are recorded without storing message bodies.

## Claim transaction

1. The server receives a UUID token through POST.
2. `claim_shift(token)` loads the token.
3. The function rejects missing, used or expired tokens.
4. PostgreSQL locks the related shift row with `FOR UPDATE`.
5. If the shift is open, the function assigns the token owner and marks the token used.
6. If another transaction has already claimed the shift, the function returns `already_claimed`.

The row lock is the serialization point. The decision is made in the database transaction rather than through an application-level read followed by a separate write.

## Authentication

The first release supports a single organisation. A coordinator enters a server-configured password. The server issues a short-lived HttpOnly cookie signed with HMAC-SHA256. The password and signing secret are never sent back to the browser.

This is suitable for an MVP pilot with controlled access, not for a multi-tenant public service. Individual accounts and role-based access remain roadmap items.
