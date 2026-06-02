import type { NextRequest } from "next/server";

import { isAdminRequest } from "@/lib/admin-auth";

export function isUnauthorizedRequest(request: NextRequest): boolean {
  return !isAdminRequest(request);
}
