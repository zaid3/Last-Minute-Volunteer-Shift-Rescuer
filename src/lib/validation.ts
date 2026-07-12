export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function cleanText(value: unknown, maxLength = 200): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function localDateTimeToUtc(value: string, timeZone: string): string | null {
  const match = LOCAL_DATETIME_RE.exec(value);
  if (!match || !isValidTimeZone(timeZone)) return null;

  const [, year, month, day, hour, minute] = match;
  const target = Date.UTC(+year, +month - 1, +day, +hour, +minute);
  let guess = target;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value])
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    const adjustment = target - represented;
    guess += adjustment;
    if (adjustment === 0) break;
  }

  const check = Object.fromEntries(
    formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value])
  );
  const reconstructed = `${check.year}-${check.month}-${check.day}T${check.hour}:${check.minute}`;
  return reconstructed === value ? new Date(guess).toISOString() : null;
}

export type ShiftInput = {
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string;
  timeZone: string;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function validateShiftInput(input: {
  title?: unknown;
  location?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
  time_zone?: unknown;
}): ValidationResult<ShiftInput> {
  const title = cleanText(input.title, 120);
  const location = cleanText(input.location, 180);
  const startsLocal = cleanText(input.starts_at, 50);
  const endsLocal = cleanText(input.ends_at, 50);
  const timeZone = cleanText(input.time_zone, 80) || "Europe/London";

  if (title.length < 3) {
    return { ok: false, error: "A shift title of at least 3 characters is required." };
  }

  const startsAt = localDateTimeToUtc(startsLocal, timeZone);
  const endsAt = localDateTimeToUtc(endsLocal, timeZone);

  if (!startsAt || !endsAt) {
    return { ok: false, error: "Valid start and end times are required." };
  }

  if (new Date(endsAt) <= new Date(startsAt)) {
    return { ok: false, error: "The end time must be after the start time." };
  }

  if (new Date(startsAt) <= new Date()) {
    return { ok: false, error: "The shift must start in the future." };
  }

  return {
    ok: true,
    value: {
      title,
      location: location || null,
      startsAt,
      endsAt,
      timeZone,
    },
  };
}

export function validateVolunteerInput(input: {
  name?: unknown;
  email?: unknown;
  active?: unknown;
}): ValidationResult<{ name: string; email: string; active: boolean }> {
  const name = cleanText(input.name, 120);
  const email = cleanText(input.email, 254).toLowerCase();

  if (name.length < 2) {
    return { ok: false, error: "A volunteer name of at least 2 characters is required." };
  }

  if (!isValidEmail(email)) {
    return { ok: false, error: "A valid volunteer email address is required." };
  }

  return {
    ok: true,
    value: { name, email, active: input.active === undefined ? true : parseBoolean(input.active) },
  };
}
