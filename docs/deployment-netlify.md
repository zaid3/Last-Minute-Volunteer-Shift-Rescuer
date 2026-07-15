# Deploying to Netlify

This project runs on Netlify using its automatic Next.js support. Netlify provisions the server-side runtime needed for App Router pages, route handlers and API endpoints.

## Prerequisites

Create accounts for:

- Netlify: application hosting and server routes
- Supabase: PostgreSQL database
- Resend: transactional email

## 1. Prepare Supabase

Create a Supabase project and run these migrations in order:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_operational_foundation.sql`
3. `supabase/migrations/0003_multi_tenant.sql`

Copy the project URL and server-side secret/service-role key. The key must never be committed to Git or exposed to browser code.

## 2. Prepare Resend

Create an API key. For production delivery, verify a sending domain or subdomain controlled by the platform operator.

All charities currently send through the platform's verified sender address. The organisation name is included in the email subject and body, while successful claim notices go to the contact email stored for that organisation.

## 3. Import the repository

In Netlify:

1. Select **Add new project**.
2. Select **Import an existing project**.
3. Connect GitHub.
4. Choose `zaid3/Last-Minute-Volunteer-Shift-Rescuer`.
5. Confirm the production branch is `main`.
6. Netlify should detect Next.js automatically.

The repository fixes the build command to `npm run build` and Node.js to version 22 through `netlify.toml`.

## 4. Add environment variables

Add these in **Project configuration → Environment variables**:

```text
NEXT_PUBLIC_APP_URL=https://YOUR-SITE-NAME.netlify.app
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM=Shift Rescuer <volunteers@YOUR-SENDING-DOMAIN>
MANAGER_SESSION_SECRET=
MANAGER_API_KEY=
```

`MANAGER_API_KEY` is optional unless an external server will call `POST /api/broadcast`. Machine requests must also include an `x-organisation-id` header.

Use a long random value for `MANAGER_SESSION_SECRET`. It signs the login session for every organisation. The former `COORDINATOR_PASSWORD` and `COORDINATOR_EMAIL` variables are no longer used.

## 5. Deploy

Trigger a production deployment. Confirm that `NEXT_PUBLIC_APP_URL` exactly matches the final HTTPS address, then redeploy after changing environment variables.

## 6. Register the first organisation

Open:

```text
/coordinator/register
```

Enter the charity name, owner name, work email and a password of at least 10 characters. Registration creates the organisation and its first owner account, then signs the owner into that organisation's private workspace.

Each additional charity uses the same registration page and receives a separate workspace.

## 7. Smoke test

Check:

1. `/api/health` returns a successful response.
2. A charity can register at `/coordinator/register`.
3. The registered owner can sign out and sign back in with email and password.
4. A test volunteer can be created.
5. A future test shift can be created.
6. A broadcast email arrives.
7. Exactly one volunteer can claim a shift.
8. The volunteer and organisation contact receive confirmation emails.
9. A second registered charity cannot see the first charity's volunteers or shifts.

Use test accounts before adding real volunteer data. Keep each charity's existing phone or messaging process available during the pilot.

## 8. Optional custom domain

A subdomain such as `volunteer.example.org` can be connected later. Update `NEXT_PUBLIC_APP_URL` to the custom HTTPS address and redeploy.
