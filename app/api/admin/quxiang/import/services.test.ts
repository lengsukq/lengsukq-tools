import { describe, expect, it } from "vitest";

import {
  buildBatchInsertValues,
  findImportConflicts,
  normalizeImportRecords,
} from "./services";

describe("normalizeImportRecords", () => {
  it("returns validation error for invalid year month", () => {
    const result = normalizeImportRecords([
      {
        rawText: "x",
        code: "A",
        phone: "13800138000",
        yearMonth: "2026/04",
      },
    ]);

    expect(result[0]).toMatchObject({
      ok: false,
      error: "日期格式应为 YYYY-MM",
    });
  });

  it("normalizes valid rows", () => {
    const result = normalizeImportRecords([
      {
        rawText: "x",
        code: " A1 ",
        phone: " 13800138000 ",
        yearMonth: "2026-04",
        isSold: true,
        soldPrice: "12.5",
      },
    ]);

    expect(result[0]).toMatchObject({
      ok: true,
      code: "A1",
      phone: "13800138000",
      yearMonth: "2026-04",
      soldPrice: 12.5,
    });
  });
});

describe("findImportConflicts", () => {
  it("finds conflict by code with different phone or month", () => {
    const conflicts = findImportConflicts(
      [
        {
          index: 0,
          ok: true,
          rawText: "x",
          code: "AAA",
          phone: "138",
          yearMonth: "2026-04",
          isSold: false,
          soldPrice: null,
        },
      ],
      [{ code: "AAA", phone: "139", year_month: "2026-04" }],
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].code).toBe("AAA");
  });
});

describe("buildBatchInsertValues", () => {
  it("builds parameterized insert fragments", () => {
    const output = buildBatchInsertValues([
      {
        index: 0,
        ok: true,
        rawText: "x",
        code: "A",
        phone: "138",
        yearMonth: "2026-04",
        isSold: false,
        soldPrice: null,
      },
    ]);

    expect(output.valuesSql).toContain("$1");
    expect(output.params).toHaveLength(6);
  });
});
