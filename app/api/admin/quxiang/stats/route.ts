import { NextRequest, NextResponse } from "next/server";

import { isUnauthorizedRequest } from "../_shared/auth";
import { buildQuxiangListWhereClause } from "../_shared/filters";
import { unauthorizedResponse } from "../_shared/responses";

import { sql } from "@/lib/db";

type StatsRow = {
  phone: string;
  year_month: string | null;
  total_codes: number;
  sold_count: number;
  total_sold_price: string | null;
};

export async function GET(request: NextRequest) {
  if (isUnauthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const phonesParam = searchParams.get("phones");
  const yearMonth = searchParams.get("yearMonth");

  const { whereClause, values } = buildQuxiangListWhereClause({
    phone,
    phonesParam,
    yearMonth,
  });

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
