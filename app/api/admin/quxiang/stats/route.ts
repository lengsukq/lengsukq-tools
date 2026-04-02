import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

type StatsRow = {
  phone: string;
  year_month: string | null;
  total_codes: number;
  sold_count: number;
  total_sold_price: string | null;
};

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const phonesParam = searchParams.get("phones");
  const yearMonth = searchParams.get("yearMonth");

  const whereParts: string[] = [];
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
      whereParts.push(`phone IN (${placeholders})`);
      values.push(...phones);
    }
  } else if (phone) {
    whereParts.push(`phone = $${values.length + 1}`);
    values.push(phone);
  }

  if (yearMonth) {
    whereParts.push(`year_month = $${values.length + 1}`);
    values.push(yearMonth);
  }

  const whereClause =
    whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const sqlText = `
    SELECT
      phone,
      year_month,
      COUNT(*) AS total_codes,
      SUM(CASE WHEN is_sold THEN 1 ELSE 0 END) AS sold_count,
      SUM(sold_price) AS total_sold_price
    FROM quxiang_codes
    ${whereClause}
    GROUP BY phone, year_month
    ORDER BY COALESCE(year_month, '' ) DESC, phone ASC
  `;

  const result = await (sql as any).query(sqlText, values);
  const rows = (result?.rows ?? result) as StatsRow[];

  const items = rows.map((row) => ({
    phone: row.phone,
    yearMonth: row.year_month,
    totalCodes: Number(row.total_codes),
    soldCount: Number(row.sold_count ?? 0),
    totalSoldPrice: row.total_sold_price,
  }));

  return NextResponse.json({ items });
}

