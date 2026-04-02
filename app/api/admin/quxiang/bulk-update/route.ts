import { NextRequest, NextResponse } from "next/server";

import { ensureTables, sql } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

type Body = {
  ids: number[];
  isSold: boolean;
  soldPrice: number | null;
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ ok: false, error: "ids 不能为空" }, { status: 400 });
  }

  const ids = body.ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: "ids 非法" }, { status: 400 });
  }

  const isSold = Boolean(body.isSold);
  const soldPrice =
    isSold && body.soldPrice !== null && body.soldPrice !== undefined
      ? Number(body.soldPrice)
      : null;

  if (isSold && soldPrice !== null && !Number.isFinite(soldPrice)) {
    return NextResponse.json(
      { ok: false, error: "soldPrice 非法" },
      { status: 400 },
    );
  }

  await (sql as any).query(
    `
      UPDATE quxiang_codes
      SET is_sold = $1, sold_price = $2
      WHERE id = ANY($3)
    `,
    [isSold, soldPrice, ids],
  );

  return NextResponse.json({ ok: true, updatedIds: ids });
}

