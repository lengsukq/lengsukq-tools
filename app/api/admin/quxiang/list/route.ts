import { NextRequest, NextResponse } from "next/server";

import { ensureTables, sql } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

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
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const phonesParam = searchParams.get("phones");
  const yearMonth = searchParams.get("yearMonth");
  const isSoldParam = searchParams.get("isSold");
  const minSoldPriceParam = searchParams.get("minSoldPrice");
  const maxSoldPriceParam = searchParams.get("maxSoldPrice");

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (phonesParam) {
    const phones = phonesParam
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (phones.length > 0) {
      const placeholders = phones
        .map((_, index) => `$${values.length + index + 1}`)
        .join(", ");
      conditions.push(`phone IN (${placeholders})`);
      values.push(...phones);
    }
  } else if (phone) {
    conditions.push(`phone = $${values.length + 1}`);
    values.push(phone);
  }

  if (yearMonth) {
    conditions.push(`year_month = $${values.length + 1}`);
    values.push(yearMonth);
  }

  if (isSoldParam === "true" || isSoldParam === "false") {
    conditions.push(`is_sold = $${values.length + 1}`);
    values.push(isSoldParam === "true");
  }

  if (minSoldPriceParam && minSoldPriceParam.trim().length > 0) {
    const min = Number(minSoldPriceParam);
    if (!Number.isFinite(min)) {
      return NextResponse.json({ error: "minSoldPrice 非法" }, { status: 400 });
    }
    conditions.push(`sold_price >= $${values.length + 1}`);
    values.push(min);
  }

  if (maxSoldPriceParam && maxSoldPriceParam.trim().length > 0) {
    const max = Number(maxSoldPriceParam);
    if (!Number.isFinite(max)) {
      return NextResponse.json({ error: "maxSoldPrice 非法" }, { status: 400 });
    }
    conditions.push(`sold_price <= $${values.length + 1}`);
    values.push(max);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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

