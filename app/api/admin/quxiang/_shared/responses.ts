import { NextResponse } from "next/server";

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function unauthorizedOkFalseResponse() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 },
  );
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function badRequestOkFalse(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
