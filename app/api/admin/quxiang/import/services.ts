import type {
  ExistingRow,
  ImportConflict,
  NormalizedImportError,
  NormalizedImportRow,
} from "./types";

import { isValidYearMonth } from "../_shared/validators";

export function normalizeImportRecords(
  inputRecords: Array<Record<string, unknown>>,
): Array<NormalizedImportError | NormalizedImportRow> {
  return inputRecords.map((record, index) => {
    if (!record || typeof record.rawText !== "string") {
      return { index, ok: false, error: "rawText 非法" };
    }

    const code = String(record.code ?? "").trim();
    const phone = String(record.phone ?? "").trim();
    const yearMonth = String(record.yearMonth ?? "").trim();
    const isSold = Boolean(record.isSold ?? false);
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
      return { index, ok: false, error: "code 不能为空" };
    }
    if (!phone) {
      return { index, ok: false, error: "phone 不能为空" };
    }
    if (!isValidYearMonth(yearMonth)) {
      return { index, ok: false, error: "日期格式应为 YYYY-MM" };
    }
    if (soldPrice !== null && !Number.isFinite(soldPrice)) {
      return { index, ok: false, error: "soldPrice 非法" };
    }

    return {
      index,
      ok: true,
      rawText: record.rawText,
      code,
      phone,
      yearMonth,
      isSold,
      soldPrice,
    };
  });
}

export function findImportConflicts(
  rows: NormalizedImportRow[],
  existingRows: ExistingRow[],
): ImportConflict[] {
  const existingByCode = new Map<
    string,
    { phone: string; year_month: string | null }
  >();

  for (const row of existingRows) {
    existingByCode.set(row.code, {
      phone: row.phone,
      year_month: row.year_month,
    });
  }

  const conflicts: ImportConflict[] = [];

  for (const row of rows) {
    const existing = existingByCode.get(row.code);

    if (!existing) {
      continue;
    }
    if (
      existing.phone !== row.phone ||
      (existing.year_month ?? null) !== (row.yearMonth ?? null)
    ) {
      conflicts.push({
        code: row.code,
        existingPhone: existing.phone,
        existingYearMonth: existing.year_month ?? null,
        incomingPhone: row.phone,
        incomingYearMonth: row.yearMonth,
      });
    }
  }

  return conflicts;
}

export function buildBatchInsertValues(rows: NormalizedImportRow[]): {
  valuesSql: string;
  params: unknown[];
} {
  const params: unknown[] = [];
  const valuesSql = rows
    .map((row) => {
      const base = params.length;

      params.push(
        row.rawText,
        row.code,
        row.phone,
        row.yearMonth,
        row.isSold,
        row.soldPrice,
      );

      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    })
    .join(", ");

  return { valuesSql, params };
}
