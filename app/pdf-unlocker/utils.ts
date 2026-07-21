import { PDFDocument } from "pdf-lib";
import { decryptPDF, isEncrypted } from "@pdfsmaller/pdf-decrypt";

import { ProcessedFile, UnlockError } from "./types";

/**
 * 检测 PDF 是否已加密（需要密码才能打开）
 */
export async function isPdfEncrypted(file: File): Promise<boolean> {
  const arrayBuffer = await file.arrayBuffer();
  const info = await isEncrypted(new Uint8Array(arrayBuffer));
  return info.encrypted;
}

/**
 * 使用密码解锁单个 PDF 文件
 * 成功解密后通过 pdf-lib 获取页数等信息
 */
export async function unlockSinglePdf(
  file: File,
  password: string,
): Promise<ProcessedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfBytes = new Uint8Array(arrayBuffer);
  const originalSize = pdfBytes.length;

  // 解密 PDF（纯前端，使用 Web Crypto API）
  const decryptedBytes = await decryptPDF(pdfBytes, password);

  // 用 pdf-lib 读取解密后的 PDF 以获取页数等信息
  const pdfDoc = await PDFDocument.load(decryptedBytes);

  return {
    name: file.name,
    pdfBytes: decryptedBytes,
    pages: pdfDoc.getPages().length,
    originalSize,
    unlockedSize: decryptedBytes.length,
  };
}

/**
 * 批量解锁多个 PDF 文件
 * 返回成功列表和失败列表
 */
export async function unlockMultiplePdfs(
  files: File[],
  password: string,
): Promise<{
  success: ProcessedFile[];
  errors: UnlockError[];
}> {
  const success: ProcessedFile[] = [];
  const errors: UnlockError[] = [];

  for (const file of files) {
    try {
      const result = await unlockSinglePdf(file, password);
      success.push(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "未知错误，请检查密码是否正确";
      errors.push({ name: file.name, error: message });
    }
  }

  return { success, errors };
}

/**
 * 下载解锁后的 PDF 文件
 */
export function downloadUnlockedFile(file: ProcessedFile): void {
  const blob = new Blob([file.pdfBytes as BlobPart], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = file.name.replace(".pdf", "_unlocked.pdf");
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
