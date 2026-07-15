# Last-Minute Volunteer Shift Rescuer

Last-Minute Volunteer Shift Rescuer helps charities fill urgent rota gaps when a scheduled volunteer cancels or does not arrive.

Multiple charities can register on the same platform. Each organisation receives a private workspace containing its own coordinator account, volunteers, shifts, claim tokens, notifications and audit records.

## How it works

1. A charity registers its organisation and owner account.
2. The coordinator adds active backup volunteers.
3. The coordinator creates an urgent open shift.
4. The system creates one unique claim token for each active volunteer in that organisation.
5. Volunteers receive personalised email alerts.
6. The first valid volunteer to confirm is assigned by a PostgreSQL transaction.
7. The volunteer and organisation contact receive confirmation emails.
8. The action is recorded in the organisation's audit trail.

## Current capabilities

- Multi-organisation registration
- Individual owner login using email and password
- Signed, short-lived HttpOnly coordinator sessions
- Organisation-scoped dashboards, volunteers and shifts
- Organisation-scoped broadcasts, claim tokens, notifications and audit records
- Create and review urgent shifts
- Add and manage active volunteers
- Broadcast an open shift to active volunteers by email
- Unique, expiring claim link for each volunteer
- POST-only confirmation to avoid accidental claims by email scanners
- Race-safe database claim function using `SELECT ... FOR UPDATE`
- Volunteer confirmation and organisation notification emails
- Deny-all Row Level Security for browser and anonymous database access
- Unit tests for validation logic
- A concurrency test script for a real Supabase environment
- GitHub Actions checks for type safety and tests

## Architecture

- **Next.js 15 and TypeScript** for pages and server route handlers
- **Supabase/PostgreSQL** for persistent data and transactional assignment
- **Resend** for transactional email delivery

```text
Organisation owner
       |
       | sign in / manage volunteers / create shifts / broadcast
       v
Next.js server routes -----> Supabase PostgreSQL
       |                           |
       |                           | organisation_id isolation
       |                           | claim_shift(token) row lock
       v                           v
    Resend email <---------- claim confirmation
```

### Tenant isolation

Every operational record contains an `organisation_id`. Coordinator sessions also contain the authenticated organisation ID. Server routes apply that ID to reads, inserts and updates so one charity cannot retrieve or change another charity's records.

Browser and anonymous database access remains denied. The Supabase service role is used only inside server code and must never be exposed to the browser.

### Concurrency control

`claim_shift()` locks the target shift row before checking its status. Concurrent claims for the same shift serialize inside PostgreSQL. One transaction changes the shift from `open` to `claimed`; waiting transactions then see the committed state and return `already_claimed`.

The function also verifies that the claim token, volunteer and shift belong to the same organisation.

### Link scanner protection

Opening `/claim/[token]` displays the shift and confirmation form only. A claim occurs after an explicit `POST /api/claim`, preventing automated email security scanners from claiming shifts while checking links.

## Setup

1. Create a Supabase project.
2. Run every SQL file in `supabase/migrations` in filename order:
   - `0001_init.sql`
   - `0002_operational_foundation.sql`
   - `0003_multi_tenant.sql`
3. Create a Resend API key and verify a sending domain.
4. Copy `.env.example` to `.env.local` and fill in the required values.
5. Install and run the application:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/coordinator/register` to create the first organisation.

## Environment variables

```text
NEXT_PUBLIC_APP_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
EMAIL_FROM
MANAGER_SESSION_SECRET
MANAGER_API_KEY        # optional
```

The previous shared `COORDINATOR_PASSWORD` and `COORDINATOR_EMAIL` variables are no longer used. Coordinator credentials and organisation contact emails are stored as organisation-scoped database records.

## Testing

```bash
npm run typecheck
npm test
```

The database concurrency test requires a configured Supabase project and two unused claim tokens for the same shift:

```bash
CLAIM_TOKEN_A=<uuid> CLAIM_TOKEN_B=<uuid> npm run test:concurrency
```

The script fails unless exactly one claim succeeds.

## Current limitations

This is an early multi-tenant MVP. Before broad production use, add email verification, password reset, login rate limiting, coordinator invitation flows, account deletion, retention controls and production monitoring.

No adoption, performance or social-impact figures are claimed until measured in a real charity pilot.

## Security and privacy

The project processes organisation contact details and volunteer names and email addresses. Review [`SECURITY.md`](SECURITY.md) and [`docs/security-and-privacy.md`](docs/security-and-privacy.md) before deployment.

## Licence

MIT
