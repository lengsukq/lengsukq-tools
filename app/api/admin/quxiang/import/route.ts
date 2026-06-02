import type {
  ExistingRow,
  ImportRequestBody,
  NormalizedImportRow,
} from "./types";

import { NextRequest, NextResponse } from "next/server";

import { isUnauthorizedRequest } from "../_shared/auth";
import { badRequest, unauthorizedResponse } from "../_shared/responses";

import {
  buildBatchInsertValues,
  findImportConflicts,
  normalizeImportRecords,
} from "./services";

import { ensureTables, sql } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (isUnauthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  await ensureTables();

  const body = (await request
    .json()
    .catch(() => null)) as ImportRequestBody | null;

  if (!body || !Array.isArray(body.records) || body.records.length === 0) {
    return badRequest("records 不能为空");
  }

  const normalized = normalizeImportRecords(
    body.records as Array<Record<string, unknown>>,
  );

  const firstError = normalized.find((r) => r.ok === false);

  if (firstError) {
    return NextResponse.json(
      { ok: false, error: firstError.error },
      { status: 400 },
    );
  }

  const rows = normalized.filter((row) => row.ok) as NormalizedImportRow[];
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
  const existingRows = (existingResult?.rows ??
    existingResult) as ExistingRow[];
  const conflicts = findImportConflicts(rows, existingRows);

  if (conflicts.length > 0) {
    return NextResponse.json(
      { ok: false, error: "存在领取码冲突，已取消整批保存", conflicts },
      { status: 409 },
    );
  }

  // 单次事务：all-or-nothing；同 code 同绑定允许更新（upsert）
  try {
    await (sql as any).query("BEGIN");

    const { valuesSql, params } = buildBatchInsertValues(rows);

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
  } catch {
    await (sql as any).query("ROLLBACK").catch(() => undefined);

    return NextResponse.json(
      { ok: false, error: "数据库写入失败" },
      { status: 500 },
    );
  }
}
