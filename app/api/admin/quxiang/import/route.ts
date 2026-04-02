import { NextRequest, NextResponse } from "next/server";

import { ensureTables, sql } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import type { QuxiangRecordInput } from "@/lib/quxiang";

type ImportRequestBody = {
  records: QuxiangRecordInput[];
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const body = (await request.json().catch(() => null)) as
    | ImportRequestBody
    | null;

  if (!body || !Array.isArray(body.records) || body.records.length === 0) {
    return NextResponse.json(
      { error: "records 不能为空" },
      { status: 400 },
    );
  }

  const normalized = body.records.map((record, index) => {
    if (!record || typeof record.rawText !== "string") {
      return { index, ok: false as const, error: "rawText 非法" };
    }

    const code = record.code?.trim();
    const phone = record.phone?.trim();
    const yearMonth = record.yearMonth?.trim();
    const isSold = record.isSold ?? false;
    const soldPriceRaw =
      typeof record.soldPrice === "number"
        ? String(record.soldPrice)
        : record.soldPrice;
    const soldPrice =
      soldPriceRaw !== undefined &&
      soldPriceRaw !== null &&
      soldPriceRaw.toString().trim().length > 0
        ? Number(soldPriceRaw)
        : null;

    if (!code) {
      return { index, ok: false as const, error: "code 不能为空" };
    }
    if (!phone) {
      return { index, ok: false as const, error: "phone 不能为空" };
    }
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return { index, ok: false as const, error: "日期格式应为 YYYY-MM" };
    }
    if (soldPrice !== null && !Number.isFinite(soldPrice)) {
      return { index, ok: false as const, error: "soldPrice 非法" };
    }

    return {
      index,
      ok: true as const,
      rawText: record.rawText,
      code,
      phone,
      yearMonth,
      isSold,
      soldPrice,
    };
  });

  const firstError = normalized.find((r) => r.ok === false);
  if (firstError) {
    return NextResponse.json({ ok: false, error: firstError.error }, { status: 400 });
  }

  const rows = normalized as Array<
    Extract<(typeof normalized)[number], { ok: true }>
  >;
  const codes = Array.from(new Set(rows.map((r) => r.code)));

  // 一次性冲突检查：同 code 但绑定到不同手机号或日期，整批失败
  const existingResult = await (sql as any).query(
    `
      SELECT code, phone, year_month
      FROM quxiang_codes
      WHERE code = ANY($1)
    `,
    [codes],
  );
  const existingRows = (existingResult?.rows ?? existingResult) as Array<{
    code: string;
    phone: string;
    year_month: string | null;
  }>;

  const existingByCode = new Map<
    string,
    { phone: string; year_month: string | null }
  >();
  for (const r of existingRows ?? []) {
    existingByCode.set(r.code, { phone: r.phone, year_month: r.year_month });
  }

  const conflicts: Array<{
    code: string;
    existingPhone: string;
    existingYearMonth: string | null;
    incomingPhone: string;
    incomingYearMonth: string;
  }> = [];

  for (const r of rows) {
    const ex = existingByCode.get(r.code);
    if (!ex) continue;
    if (ex.phone !== r.phone || (ex.year_month ?? null) !== (r.yearMonth ?? null)) {
      conflicts.push({
        code: r.code,
        existingPhone: ex.phone,
        existingYearMonth: ex.year_month ?? null,
        incomingPhone: r.phone,
        incomingYearMonth: r.yearMonth,
      });
    }
  }

  if (conflicts.length > 0) {
    return NextResponse.json(
      { ok: false, error: "存在领取码冲突，已取消整批保存", conflicts },
      { status: 409 },
    );
  }

  // 单次事务：all-or-nothing；同 code 同绑定允许更新（upsert）
  try {
    await (sql as any).query("BEGIN");

    const params: unknown[] = [];
    const valuesSql = rows
      .map((r) => {
        const base = params.length;
        params.push(r.rawText, r.code, r.phone, r.yearMonth, r.isSold, r.soldPrice);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
      })
      .join(", ");

    const upsertResult = await (sql as any).query(
      `
        INSERT INTO quxiang_codes (raw_text, code, phone, year_month, is_sold, sold_price)
        VALUES ${valuesSql}
        ON CONFLICT (code) DO UPDATE SET
          raw_text = EXCLUDED.raw_text,
          phone = EXCLUDED.phone,
          year_month = EXCLUDED.year_month,
          is_sold = EXCLUDED.is_sold,
          sold_price = EXCLUDED.sold_price
      `,
      params,
    );

    await (sql as any).query("COMMIT");

    const affected =
      typeof upsertResult?.rowCount === "number" ? upsertResult.rowCount : null;
    return NextResponse.json({
      ok: true,
      affected: affected ?? undefined,
      total: rows.length,
    });
  } catch (error) {
    await (sql as any).query("ROLLBACK").catch(() => undefined);
    console.error("导入趣象记录失败:", error);
    return NextResponse.json({ ok: false, error: "数据库写入失败" }, { status: 500 });
  }
}

