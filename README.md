# Last-Minute Volunteer Shift Rescuer

Last-Minute Volunteer Shift Rescuer helps charities fill urgent rota gaps when a scheduled volunteer cancels or does not arrive.

A coordinator creates a shift and alerts active backup volunteers by email. Each volunteer receives a unique claim link. The first person to confirm is assigned to the shift; later claim attempts receive a clear “already covered” response.

## Why this exists

Last-minute volunteer absence can interrupt food distribution, community support, events and other time-sensitive services. Coordinators often respond by calling people individually or posting in group chats. That process is slow, difficult to track and vulnerable to duplicate confirmations.

This project provides a small, auditable workflow for urgent cover:

1. A coordinator records an open shift.
2. The system creates one claim token per active volunteer.
3. Volunteers receive personalised email alerts.
4. A volunteer reviews the shift and explicitly confirms availability.
5. A PostgreSQL transaction assigns the first valid claimant.
6. The volunteer and coordinator receive confirmation emails.
7. The action is recorded in an audit trail.

## Current capabilities

- Password-protected coordinator area
- Create and review urgent shifts
- Add and manage active volunteers
- Broadcast an open shift to active volunteers by email
- Unique, expiring claim link for each volunteer
- POST-only confirmation to avoid accidental claims by email link scanners
- Race-safe database claim function using `SELECT ... FOR UPDATE`
- Volunteer confirmation and coordinator notification emails
- Audit events and notification delivery records
- Deny-all Row Level Security for browser and anonymous database access
- Unit tests for validation logic
- A concurrency test script for a real Supabase environment
- GitHub Actions checks for type safety and tests

## Architecture

- **Next.js 15 and TypeScript** for the application and server route handlers
- **Supabase/PostgreSQL** for persistent data and transactional shift assignment
- **Resend** for transactional email delivery

```text
Coordinator dashboard
        |
        | create shift / manage volunteers / broadcast
        v
Next.js server routes -----> Supabase PostgreSQL
        |                         |
        |                         | claim_shift(token)
        |                         | row lock + atomic update
        v                         v
     Resend email <--------- claim confirmation
```

### Concurrency control

`claim_shift()` locks the target shift row before checking its status. Concurrent claims for the same shift therefore serialize inside PostgreSQL. One transaction changes the shift from `open` to `claimed`; waiting transactions then see the committed state and return `already_claimed`.

### Link scanner protection

Opening `/claim/[token]` only displays the shift and confirmation form. It does not modify data. A claim occurs only after the volunteer submits an explicit `POST /api/claim` request. This prevents automated email security scanners from claiming shifts while checking links.

## Local setup

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations` in filename order.
3. Create a Resend API key and verify a sending domain.
4. Copy `.env.example` to `.env.local` and fill in every required value.
5. Install and run the application:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/coordinator/login` and sign in with `COORDINATOR_PASSWORD`.

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

## Project status

This repository contains a working MVP architecture. It still requires deployment-specific configuration, a real charity pilot and production monitoring before operational use. The roadmap is documented in [`docs/roadmap.md`](docs/roadmap.md).

No adoption, performance or social-impact figures are claimed until they are measured in a real pilot. The measurement plan is documented in [`docs/impact-measurement.md`](docs/impact-measurement.md).

## Security and privacy

The project processes volunteer names and email addresses. Review [`SECURITY.md`](SECURITY.md) and [`docs/security-and-privacy.md`](docs/security-and-privacy.md) before deployment.

## Licence

MIT
