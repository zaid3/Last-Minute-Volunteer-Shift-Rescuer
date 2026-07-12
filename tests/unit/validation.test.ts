import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  isValidUuid,
  localDateTimeToUtc,
  validateShiftInput,
  validateVolunteerInput,
} from "../../src/lib/validation";

describe("validation", () => {
  it("accepts valid emails and rejects malformed addresses", () => {
    expect(isValidEmail("volunteer@example.org")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("validates UUID claim tokens", () => {
    expect(isValidUuid("6f9619ff-8b86-4e4c-a111-6e530e6b447a")).toBe(true);
    expect(isValidUuid("invalid")).toBe(false);
  });

  it("converts UK summer local time to UTC", () => {
    expect(localDateTimeToUtc("2026-08-01T12:00", "Europe/London"))
      .toBe("2026-08-01T11:00:00.000Z");
  });

  it("rejects a shift that ends before it starts", () => {
    const result = validateShiftInput({
      title: "Community kitchen",
      starts_at: "2026-08-01T12:00",
      ends_at: "2026-08-01T11:00",
      time_zone: "Europe/London",
    });
    expect(result.ok).toBe(false);
  });

  it("normalises a volunteer email", () => {
    const result = validateVolunteerInput({
      name: "Sam Volunteer",
      email: "  SAM@EXAMPLE.ORG ",
    });
    expect(result).toEqual({
      ok: true,
      value: { name: "Sam Volunteer", email: "sam@example.org", active: true },
    });
  });
});
