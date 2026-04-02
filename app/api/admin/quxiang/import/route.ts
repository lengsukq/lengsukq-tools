import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import type { QuxiangRecordInput } from "@/lib/quxiang";

type ImportRequestBody = {
  records: QuxiangRecordInput[];
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | ImportRequestBody
    | null;

  if (!body || !Array.isArray(body.records) || body.records.length === 0) {
    return NextResponse.json(
      { error: "records 不能为空" },
      { status: 400 },
    );
  }

  const results: Array<{ index: number; ok: boolean; error?: string }> = [];

  for (let index = 0; index < body.records.length; index += 1) {
    const record = body.records[index];

    try {
      if (!record || typeof record.rawText !== "string") {
        results.push({ index, ok: false, error: "rawText 非法" });
        continue;
      }

      const code = record.code?.trim();
      const phone = record.phone ?? null;
      const yearMonth = record.yearMonth ?? null;
      const isSold = record.isSold ?? false;
      const soldPriceRaw =
        typeof record.soldPrice === "number"
          ? String(record.soldPrice)
          : record.soldPrice;
      const soldPrice =
        soldPriceRaw && soldPriceRaw.toString().trim().length > 0
          ? Number(soldPriceRaw)
          : null;

      if (!code) {
        results.push({ index, ok: false, error: "code 不能为空" });
        continue;
      }

      if (!phone) {
        results.push({ index, ok: false, error: "phone 不能为空" });
        continue;
      }

      // 同一领取码后导入的覆盖先前记录（解析结果与归类更新）
      await sql`DELETE FROM quxiang_codes WHERE code = ${code}`;
      await sql`
        INSERT INTO quxiang_codes (raw_text, code, phone, year_month, is_sold, sold_price)
        VALUES (${record.rawText}, ${code}, ${phone}, ${yearMonth}, ${isSold}, ${soldPrice})
      `;

      results.push({ index, ok: true });
    } catch (error) {
      console.error("导入趣象记录失败:", error);
      results.push({ index, ok: false, error: "数据库写入失败" });
    }
  }

  return NextResponse.json({ results });
}

