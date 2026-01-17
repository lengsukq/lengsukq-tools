import { HttpMethod } from "./types";

/**
 * API 客户端常量配置
 */
export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
];

export const BODY_TYPES = [
  { key: "json", label: "JSON" },
  { key: "text", label: "Text" },
  { key: "form-urlencoded", label: "Form URL Encoded" },
  { key: "form-data", label: "Form Data" },
] as const;

export const DEFAULT_HEADERS: Array<{ key: string; value: string }> = [
  { key: "Content-Type", value: "application/json" },
  { key: "Accept", value: "application/json" },
];

export const STORAGE_KEYS = {
  HISTORY: "api-client-history",
  REQUESTS: "api-client-requests",
} as const;
