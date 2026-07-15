import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { getSessionSecret } from "@/lib/env";

export const SESSION_COOKIE = "shift_rescuer_session";
const SESSION_SECONDS = 60 * 60 * 8;
const PASSWORD_BYTES = 64;

export type CoordinatorRole = "owner" | "coordinator" | "viewer";

export type CoordinatorSession = {
  coordinatorId: string;
  organisationId: string;
  role: CoordinatorRole;
  expiresAt: number;
};

type SessionInput = Omit<CoordinatorSession, "expiresAt">;

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_BYTES).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(candidate: string, stored: string): boolean {
  const [scheme, salt, expected, extra] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected || extra) return false;

  try {
    const actual = scryptSync(candidate, salt, PASSWORD_BYTES).toString("hex");
    return safeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSessionToken(input: SessionInput, now = Date.now()): string {
  const session: CoordinatorSession = {
    ...input,
    expiresAt: Math.floor(now / 1000) + SESSION_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string | undefined,
  now = Date.now(),
): CoordinatorSession | null {
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra || !safeEqual(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<CoordinatorSession>;

    if (
      typeof session.coordinatorId !== "string" ||
      typeof session.organisationId !== "string" ||
      !["owner", "coordinator", "viewer"].includes(String(session.role)) ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Math.floor(now / 1000)
    ) {
      return null;
    }

    return session as CoordinatorSession;
  } catch {
    return null;
  }
}

export async function getCoordinatorSession(): Promise<CoordinatorSession | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function isCoordinatorAuthenticated(): Promise<boolean> {
  return Boolean(await getCoordinatorSession());
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};
