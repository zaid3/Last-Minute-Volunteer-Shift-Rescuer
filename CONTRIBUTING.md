# Contributing

Thank you for helping improve Last-Minute Volunteer Shift Rescuer.

## Development workflow

1. Create a focused branch from `main`.
2. Keep changes small enough to review.
3. Add or update tests for behavioural changes.
4. Run `npm run typecheck` and `npm test`.
5. Explain the operational problem and the chosen solution in the pull request.

## Design principles

- Protect volunteer privacy.
- Do not execute claims on GET requests.
- Keep assignment decisions atomic at the database layer.
- Prefer simple operational workflows that charity coordinators can understand.
- Do not include real volunteer data in fixtures, screenshots or issues.

## Reporting bugs

Use the bug-report issue template. Security vulnerabilities must be reported privately as described in `SECURITY.md`.
