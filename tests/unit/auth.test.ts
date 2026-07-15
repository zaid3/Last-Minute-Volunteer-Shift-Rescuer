import { beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from "../../src/lib/auth";

beforeEach(() => {
  process.env.MANAGER_SESSION_SECRET = "test-session-secret-that-is-long-and-unique";
});

describe("coordinator passwords", () => {
  it("accepts the correct password and rejects another password", () => {
    const stored = hashPassword("a-strong-charity-password");

    expect(verifyPassword("a-strong-charity-password", stored)).toBe(true);
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("uses a different salt for each password hash", () => {
    const first = hashPassword("same-password");
    const second = hashPassword("same-password");

    expect(first).not.toBe(second);
    expect(verifyPassword("same-password", first)).toBe(true);
    expect(verifyPassword("same-password", second)).toBe(true);
  });
});

describe("coordinator sessions", () => {
  const input = {
    coordinatorId: "11111111-1111-4111-8111-111111111111",
    organisationId: "22222222-2222-4222-8222-222222222222",
    role: "owner" as const,
  };

  it("round-trips a valid signed session", () => {
    const now = Date.UTC(2026, 6, 15);
    const token = createSessionToken(input, now);
    const session = verifySessionToken(token, now + 1_000);

    expect(session).toMatchObject(input);
  });

  it("rejects a changed signature", () => {
    const token = createSessionToken(input);
    const changed = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(verifySessionToken(changed)).toBeNull();
  });

  it("rejects an expired session", () => {
    const now = Date.UTC(2026, 6, 15);
    const token = createSessionToken(input, now);

    expect(verifySessionToken(token, now + 9 * 60 * 60 * 1_000)).toBeNull();
  });
});
