# Last-Minute Volunteer Shift Rescuer

An open-source tool for charities: when a volunteer drops out at the last
minute, a coordinator broadcasts the open shift to backup volunteers by email.
Each volunteer receives a **single-use claim link**. The first volunteer to
confirm claims the shift; everyone else sees a friendly "already covered"
message -- even if they click at the exact same moment.

## Architecture

- **Next.js (App Router)** -- server components + route handlers, deployable on Vercel's free tier
- **Supabase (PostgreSQL)** -- data layer; all access via the service role from the server only (RLS locked down, no client-side DB access)
- **Resend** -- transactional email dispatch for shift alerts

```
Coordinator --POST /api/broadcast--> create single-use tokens --> Resend emails
Volunteer   --clicks link--> /claim/[token]  (confirmation page, no side effects on GET)
            --confirms (POST /api/claim)--> claim_shift() RPC --> claimed | already_claimed
```

## Concurrency design

The claim path is race-safe at the database level. `claim_shift()` is a
PostgreSQL function that takes a **row-level lock** on the shift
(`SELECT ... FOR UPDATE`) before checking and updating its status. Concurrent
claims on the same shift serialize on the lock: the first transaction commits
`status = 'claimed'`; waiting transactions then observe the committed state
and return `already_claimed`. No advisory locks, no application-level
mutexes, no double-booking.

Claims are deliberately **not** executed on the GET request from the email
link -- email security scanners prefetch URLs, which would silently claim
shifts. The link lands on a confirmation page and the claim happens on an
explicit POST.

## Setup

1. Create a [Supabase](https://supabase.com) project and run
   `supabase/migrations/0001_init.sql` in the SQL editor.
2. Create a [Resend](https://resend.com) API key and verify a sending domain
   (or use the sandbox sender for testing).
3. Copy `.env.example` to `.env.local` and fill in the values.
4. `npm install && npm run dev`

## API

### `POST /api/broadcast`

Coordinator-only (requires `x-manager-key` header matching `MANAGER_API_KEY`).

```json
{ "shift_id": "<uuid>" }
```

Creates one single-use token per active volunteer and emails each of them a
claim link. Returns `{ "alerted": n, "failed": m }`.

### `POST /api/claim`

Form post from the confirmation page (`token` field). Calls the `claim_shift`
RPC and redirects back to the claim page with the outcome.

## Status and roadmap

Early-stage scaffold, built with AI-assisted development. Roadmap:

- Coordinator dashboard (create shifts, trigger broadcasts, see who claimed)
- Confirmation email to the claiming volunteer + notification to coordinator
- Waitlist / second-chance reassignment if a claimer later drops out
- Scheduled sweep to mark unclaimed past shifts as `expired`
- Concurrency test harness (parallel claim storm against a single shift)
- SMS channel

## License

MIT
