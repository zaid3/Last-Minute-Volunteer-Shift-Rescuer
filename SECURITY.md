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
- Use a long coordinator password and rotate it after staff changes.
- Verify the Resend sending domain.
- Restrict access to production environment variables.
- Configure database backups and retention before storing live volunteer data.
- Review audit and notification logs without copying personal data into external systems.

The first release uses one shared coordinator credential. Multi-user identity and role-based access are planned before multi-organisation use.
