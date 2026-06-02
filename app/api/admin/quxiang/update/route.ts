import { NextRequest, NextResponse } from "next/server";

import { isUnauthorizedRequest } from "../_shared/auth";
import { badRequest, unauthorizedResponse } from "../_shared/responses";
import { isValidYearMonth } from "../_shared/validators";

import { ensureTables, sql } from "@/lib/db";

type UpdateBody = {
  id: number;
  code: string;
  phone: string;
  yearMonth: string;
  isSold: boolean;
  soldPrice?: string | number | null;
};

export async function POST(request: NextRequest) {
  if (isUnauthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  await ensureTables();

  const body = (await request.json().catch(() => null)) as UpdateBody | null;

  if (!body || typeof body.id !== "number") {
    return badRequest("id 非法");
  }

  const code = body.code?.trim();
  const phone = body.phone?.trim();
  const yearMonth = body.yearMonth?.trim();
  const isSold = Boolean(body.isSold);
  const soldPriceRaw =
    typeof body.soldPrice === "number"
      ? String(body.soldPrice)
      : body.soldPrice;
  const soldPrice =
    soldPriceRaw !== undefined &&
    soldPriceRaw !== null &&
    soldPriceRaw.toString().trim().length > 0
      ? Number(soldPriceRaw)
      : null;

  if (!code) {
    return badRequest("领取码不能为空");
  }
  if (!phone) {
    return badRequest("手机号不能为空");
  }
  if (!yearMonth || !isValidYearMonth(yearMonth)) {
    return badRequest("日期格式应为 YYYY-MM");
  }

  // 领取码全局唯一：若同 code 已存在且 id 不同，拒绝更新
  const existingResult = await (sql as any)`
    SELECT id
    FROM quxiang_codes
    WHERE code = ${code}
  `;
  const existing = (existingResult ?? []) as { id: number }[];
  const conflict = existing.find((row) => row.id !== body.id);

  if (conflict) {
    return NextResponse.json(
      { error: "该领取码已存在于其他记录，禁止重复使用" },
      { status: 409 },
    );
  }

  const result = await (sql as any).query(
    `
      UPDATE quxiang_codes
      SET code = $1, phone = $2, year_month = $3, is_sold = $4, sold_price = $5
      WHERE id = $6
      RETURNING id, code, phone, year_month, is_sold, sold_price, created_at, raw_text
    `,
    [code, phone, yearMonth, isSold, soldPrice, body.id],
  );

  const row = ((result?.rows ?? result) as any[])?.[0];

  if (!row) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      id: row.id,
      code: row.code,
      phone: row.phone,
      yearMonth: row.year_month,
      isSold: row.is_sold,
      soldPrice: row.sold_price,
      createdAt: row.created_at,
      rawText: row.raw_text,
    },
  });
}
