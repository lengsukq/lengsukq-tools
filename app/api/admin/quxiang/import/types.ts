import type { QuxiangRecordInput } from "@/lib/quxiang";

export type ImportRequestBody = {
  records: QuxiangRecordInput[];
};

export type NormalizedImportError = {
  index: number;
  ok: false;
  error: string;
};

export type NormalizedImportRow = {
  index: number;
  ok: true;
  rawText: string;
  code: string;
  phone: string;
  yearMonth: string;
  isSold: boolean;
  soldPrice: number | null;
};

export type ExistingRow = {
  code: string;
  phone: string;
  year_month: string | null;
};

export type ImportConflict = {
  code: string;
  existingPhone: string;
  existingYearMonth: string | null;
  incomingPhone: string;
  incomingYearMonth: string;
};
