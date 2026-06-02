import type { QuxiangRecordInput } from "@/lib/quxiang";

export type ParsedRow = QuxiangRecordInput & {
  id: number;
  status?: "pending" | "saved" | "error";
  errorMessage?: string;
};

export type SavedRecord = {
  id: number;
  code: string;
  phone: string | null;
  yearMonth: string | null;
  isSold: boolean;
  soldPrice: string | null;
  createdAt: string;
  rawText: string;
};

export type EditableSavedRecord = {
  id: number;
  code: string;
  phone: string;
  yearMonth: string;
  isSold: boolean;
  soldPrice: string;
};

export type StatsItem = {
  phone: string;
  yearMonth: string | null;
  totalCodes: number;
  soldCount: number;
  totalSoldPrice: string | null;
};

export type PhoneItem = {
  id: number;
  value: string;
};

export type SoldFilter = "all" | "sold" | "unsold";
