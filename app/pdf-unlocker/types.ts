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

export interface UnlockError {
  name: string;
  error: string;
}
