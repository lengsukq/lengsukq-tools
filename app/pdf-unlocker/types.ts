/**
 * PDF 解锁工具的类型定义
 */

export interface ProcessedFile {
  name: string;
  pdfBytes: Uint8Array;
  pages: number;
  originalSize: number;
  unlockedSize: number;
}

export type UnlockErrorCode =
  | "PASSWORD_REQUIRED"
  | "INVALID_PASSWORD"
  | "UNSUPPORTED_BROWSER"
  | "INVALID_PDF"
  | "PROCESSING_FAILED";

export interface UnlockError {
  name: string;
  error: string;
  code: UnlockErrorCode;
  requiresPassword: boolean;
}

export interface UnlockProgress {
  current: number;
  total: number;
}
