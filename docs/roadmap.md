# Roadmap

## Current multi-tenant MVP

- charity and community-organisation registration
- individual owner accounts with email/password sign-in
- organisation-scoped coordinator sessions
- organisation-level isolation for volunteers, shifts, tokens, notifications and audit records
- shift creation and overview
- volunteer management
- email broadcasting
- race-safe volunteer claim flow
- confirmation emails
- validation and automated unit tests

## Pilot readiness

- add email verification and password reset
- add login and registration rate limiting
- deploy separate staging and production environments
- add automated expiry processing
- add delivery retry policy
- complete accessibility review
- add backup and recovery procedures
- create data retention and deletion workflow
- complete a controlled security review

## Multi-user organisation release

- coordinator invitation flow
- owner, coordinator and viewer permission enforcement
- coordinator offboarding and session revocation
- organisation profile and contact settings
- organisation suspension and deletion controls
- detailed audit export

## Future channels

SMS or messaging channels will be considered only after the email workflow is measured in a real pilot. They are not part of the current implementation.
