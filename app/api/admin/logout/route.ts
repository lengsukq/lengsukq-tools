import { NextRequest, NextResponse } from "next/server";

import { getAdminCookieName } from "@/lib/admin-auth";

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(getAdminCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

