import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyCoordinatorPassword,
} from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  }

  const form = await req.formData();
  const password = String(form.get("password") ?? "");

  if (!verifyCoordinatorPassword(password)) {
    return NextResponse.redirect(new URL("/coordinator/login?error=invalid", req.url), 303);
  }

  const response = NextResponse.redirect(new URL("/coordinator", req.url), 303);
  response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  return response;
}
