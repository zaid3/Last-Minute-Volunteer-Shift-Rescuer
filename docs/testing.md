# Testing strategy

## Unit tests

Validation tests cover email addresses, UUIDs, required text and shift date ranges.

## Type checking

TypeScript strict mode is enabled and checked in CI.

## Database concurrency test

`scripts/concurrency-test.ts` submits two claim RPC calls concurrently for two unused volunteer tokens belonging to the same open shift. The test passes only when exactly one response is `claimed` and the other is a non-winning state.

This test must run against an isolated test project because it changes shift data.

## Manual end-to-end test

1. Add two active test volunteers.
2. Create a shift starting in the future.
3. Broadcast the shift.
4. Open both claim links in separate browsers.
5. Submit both confirmations as close together as possible.
6. Verify that only one volunteer is assigned.
7. Verify that the winner and coordinator receive confirmation emails.
8. Verify that audit and notification records were created.

## Planned coverage

- automated browser tests for coordinator and volunteer flows
- retry and failure tests for email delivery
- session expiration and CSRF tests
- accessibility checks
- load testing for larger volunteer lists
