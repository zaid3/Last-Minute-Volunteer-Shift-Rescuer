# Security policy

## Supported version

Security fixes are applied to the current `main` branch.

## Reporting a vulnerability

Do not open a public issue containing credentials, personal data or an exploitable vulnerability. Contact the repository owner privately with:

- the affected route or component
- steps to reproduce
- the potential impact
- a suggested mitigation, where available

## Deployment requirements

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- Use a unique, high-entropy `MANAGER_SESSION_SECRET`.
- Verify the Resend sending domain.
- Restrict access to production environment variables.
- Run every database migration in filename order.
- Configure database backups and retention before storing live volunteer data.
- Review audit and notification logs without copying personal data into external systems.

## Multi-tenant requirements

- Every query involving volunteers, shifts, claim tokens, notifications or audit records must include the authenticated `organisation_id`.
- Every new operational record must be written with that organisation ID.
- Do not trust an organisation ID submitted through a normal coordinator form; use the signed session value.
- Machine-to-machine broadcast requests must provide both the manager API key and `x-organisation-id`.
- The service role bypasses RLS, so server-side tenant filtering is a mandatory security boundary.

## Current limitations

The MVP stores scrypt password hashes and signed HttpOnly sessions. Before broad public release, add email verification, password reset, login rate limiting, coordinator invitation controls, account recovery and monitored security logging.
