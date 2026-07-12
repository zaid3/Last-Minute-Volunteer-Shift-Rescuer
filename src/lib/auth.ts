import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getCoordinatorPassword, getSessionSecret } from "@/lib/env";

export const SESSION_COOKIE = "shift_rescuer_session";
const SESSION_SECONDS = 60 * 60 * 8;

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(expiresAt: string): string {
  return createHmac("sha256", getSessionSecret()).update(expiresAt).digest("hex");
}

export function verifyCoordinatorPassword(candidate: string): boolean {
  return safeEqual(candidate, getCoordinatorPassword());
}

export function createSessionToken(now = Date.now()): string {
  const expiresAt = String(Math.floor(now / 1000) + SESSION_SECONDS);
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expiresAt, signature, extra] = token.split(".");
  if (!expiresAt || !signature || extra) return false;
  if (!/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Math.floor(now / 1000)) return false;
  return safeEqual(signature, sign(expiresAt));
}

export async function isCoordinatorAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};
