# Deploying to Netlify

This project is designed to run on Netlify using its automatic Next.js support.
Netlify provisions the server-side runtime needed for App Router pages, route
handlers and API endpoints; no custom Next.js adapter is pinned in this
repository.

## Prerequisites

Create free accounts for:

- Netlify: application hosting and server routes
- Supabase: PostgreSQL database
- Resend: transactional email

## 1. Prepare Supabase

Create a Supabase project and run these migrations in order:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_operational_foundation.sql`

Copy the project URL and service-role key. The service-role key must remain a
server-side secret and must never be committed to Git.

## 2. Prepare Resend

Create an API key. For production email delivery, verify a sending domain or a
subdomain of a domain controlled by the charity.

## 3. Import the repository

In Netlify:

1. Select **Add new project**.
2. Select **Import an existing project**.
3. Connect GitHub.
4. Choose `zaid3/Last-Minute-Volunteer-Shift-Rescuer`.
5. Confirm the production branch is `main`.
6. Netlify should detect Next.js automatically.

The repository fixes the build command to `npm run build` and Node.js to version
22 through `netlify.toml`.

## 4. Add environment variables

Add these in **Project configuration → Environment variables**:

```text
NEXT_PUBLIC_APP_URL=https://YOUR-SITE-NAME.netlify.app
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM=Shift Rescuer <volunteers@YOUR-SENDING-DOMAIN>
COORDINATOR_EMAIL=
COORDINATOR_PASSWORD=
MANAGER_SESSION_SECRET=
MANAGER_API_KEY=
```

Use long, unique random values for `MANAGER_SESSION_SECRET` and
`MANAGER_API_KEY`. Do not reuse the coordinator password.

## 5. Deploy

Trigger a production deployment. After Netlify assigns the final `.netlify.app`
URL, confirm that `NEXT_PUBLIC_APP_URL` exactly matches that HTTPS address and
redeploy if it changed.

## 6. Smoke test

Check:

1. `/api/health` returns a successful response.
2. `/coordinator/login` accepts the configured coordinator password.
3. A test volunteer can be created.
4. A future test shift can be created.
5. A broadcast email arrives.
6. Exactly one volunteer can claim a shift.
7. The volunteer and coordinator receive confirmation emails.

Use test accounts before adding real volunteer data. Keep the charity's existing
phone or messaging process available during the pilot.

## 7. Optional custom domain

A subdomain such as `volunteer.example.org` can be connected later without
changing the application architecture. Update `NEXT_PUBLIC_APP_URL` to the
custom HTTPS address and redeploy.
