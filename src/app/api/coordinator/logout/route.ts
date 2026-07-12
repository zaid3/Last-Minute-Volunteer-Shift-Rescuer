import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  }

  const response = NextResponse.redirect(new URL("/", req.url), 303);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
