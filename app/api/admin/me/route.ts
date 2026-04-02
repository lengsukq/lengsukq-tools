import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const authenticated = isAdminRequest(request);

  if (!authenticated) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 },
    );
  }

  return NextResponse.json({ authenticated: true });
}

