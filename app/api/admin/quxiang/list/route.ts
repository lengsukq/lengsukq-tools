import { NextRequest, NextResponse } from "next/server";

import { isUnauthorizedRequest } from "../_shared/auth";
import { buildQuxiangListWhereClause } from "../_shared/filters";
import { badRequest, unauthorizedResponse } from "../_shared/responses";

import { ensureTables, sql } from "@/lib/db";

type Row = {
  id: number;
  code: string;
  phone: string | null;
  year_month: string | null;
  is_sold: boolean;
  sold_price: string | null;
  created_at: string;
  raw_text: string;
};

export async function GET(request: NextRequest) {
  if (isUnauthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  await ensureTables();

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const phonesParam = searchParams.get("phones");
  const yearMonth = searchParams.get("yearMonth");
  const isSoldParam = searchParams.get("isSold");
  const minSoldPriceParam = searchParams.get("minSoldPrice");
  const maxSoldPriceParam = searchParams.get("maxSoldPrice");

  const { whereClause, values, error } = buildQuxiangListWhereClause({
    phone,
    phonesParam,
    yearMonth,
    isSoldParam,
    minSoldPriceParam,
    maxSoldPriceParam,
  });

  if (error) {
    return badRequest(error);
  }

  const sqlText = `
    SELECT id, code, phone, year_month, is_sold, sold_price, created_at, raw_text
    FROM quxiang_codes
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 200
  `;

  const result = await (sql as any).query(sqlText, values);
  const rows = (result?.rows ?? result) as Row[];

  const items = rows.map((row) => ({
    id: row.id,
    code: row.code,
    phone: row.phone,
    yearMonth: row.year_month,
    isSold: row.is_sold,
    soldPrice: row.sold_price,
    createdAt: row.created_at,
    rawText: row.raw_text,
  }));

  return NextResponse.json({ items });
}
