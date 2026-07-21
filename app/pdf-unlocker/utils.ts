import { PDFDocument } from "pdf-lib";
import type { QpdfRunError, QpdfRunner } from "qpdf-run";

import {
  ProcessedFile,
  UnlockError,
  UnlockErrorCode,
  UnlockProgress,
} from "./types";

const INPUT_FILE_NAME = "input.pdf";
const OUTPUT_FILE_NAME = "unlocked.pdf";
const QPDF_TIMEOUT_MS = 120_000;

interface ClassifiedError {
  code: UnlockErrorCode;
  message: string;
  requiresPassword: boolean;
}

/**
 * 使用浏览器端 QPDF WebAssembly 解锁单个 PDF。
 * 空密码可以直接移除“能打开但禁止复制/打印/编辑”的权限限制。
 * 真正设置了打开密码的 PDF 仍然必须提供正确密码。
 */
async function unlockSinglePdf(
  file: File,
  password: string,
  runner: QpdfRunner,
): Promise<ProcessedFile> {
  const pdfBytes = new Uint8Array(await file.arrayBuffer());
  const decryptedBytes = await runner.runOne({
    input: pdfBytes,
    inputName: INPUT_FILE_NAME,
    outputName: OUTPUT_FILE_NAME,
    args: [
      `--password=${password}`,
      "--decrypt",
      "--",
      INPUT_FILE_NAME,
      OUTPUT_FILE_NAME,
    ],
  });

  const pdfDoc = await PDFDocument.load(decryptedBytes, {
    updateMetadata: false,
  });

  return {
    name: file.name,
    pdfBytes: decryptedBytes,
    pages: pdfDoc.getPageCount(),
    originalSize: pdfBytes.length,
    unlockedSize: decryptedBytes.length,
  };
}

/**
 * 批量解锁多个 PDF 文件。QPDF 只在浏览器 Web Worker 中运行，
 * 文件内容和密码不会上传到服务器。
 */
export async function unlockMultiplePdfs(
  files: File[],
  password = "",
  onProgress?: (progress: UnlockProgress) => void,
): Promise<{
  success: ProcessedFile[];
  errors: UnlockError[];
}> {
  const success: ProcessedFile[] = [];
  const errors: UnlockError[] = [];
  let runner: QpdfRunner | undefined;

  try {
    const { createQpdfRunner } = await import("qpdf-run");

    runner = await createQpdfRunner({ timeoutMs: QPDF_TIMEOUT_MS });

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];

      try {
        success.push(await unlockSinglePdf(file, password, runner));
      } catch (error) {
        const classified = classifyUnlockError(error, password.length > 0);

        errors.push({
          name: file.name,
          error: classified.message,
          code: classified.code,
          requiresPassword: classified.requiresPassword,
        });
      }

      onProgress?.({ current: index + 1, total: files.length });
    }
  } catch (error) {
    const classified = classifyUnlockError(error, password.length > 0);

    for (const file of files) {
      errors.push({
        name: file.name,
        error: classified.message,
        code: classified.code,
        requiresPassword: classified.requiresPassword,
      });
    }
  } finally {
    await runner?.destroy();
  }

  return { success, errors };
}

function classifyUnlockError(
  error: unknown,
  passwordWasProvided: boolean,
): ClassifiedError {
  const qpdfError = error as Partial<QpdfRunError> | undefined;
  const details = [
    error instanceof Error ? error.message : String(error ?? ""),
    ...(qpdfError?.stderr ?? []),
  ]
    .join("\n")
    .toLowerCase();

  if (
    /invalid password|incorrect password|password required|requires a password|password-protected/.test(
      details,
    )
  ) {
    return {
      code: passwordWasProvided ? "INVALID_PASSWORD" : "PASSWORD_REQUIRED",
      message: passwordWasProvided
        ? "打开密码不正确，请检查后重试"
        : "此 PDF 设置了打开密码，请输入原密码后重试",
      requiresPassword: true,
    };
  }

  if (
    qpdfError?.code === "QPDF_INIT_FAILED" ||
    /web worker is unavailable|webassembly|wasm/.test(details)
  ) {
    return {
      code: "UNSUPPORTED_BROWSER",
      message: "当前浏览器无法启动本地 PDF 解锁引擎，请升级浏览器后重试",
      requiresPassword: false,
    };
  }

  if (
    /not a pdf|damaged pdf|unable to find trailer|xref|invalid pdf|file is damaged/.test(
      details,
    )
  ) {
    return {
      code: "INVALID_PDF",
      message: "PDF 文件已损坏或格式不受支持",
      requiresPassword: false,
    };
  }

  return {
    code: "PROCESSING_FAILED",
    message:
      qpdfError?.code === "QPDF_TIMEOUT"
        ? "PDF 处理超时，请尝试减小文件或单独处理"
        : "PDF 解锁失败，请确认文件完整后重试",
    requiresPassword: false,
  };
}

/**
 * 下载解锁后的 PDF 文件。
 */
export function downloadUnlockedFile(file: ProcessedFile): void {
  const blob = new Blob([file.pdfBytes as BlobPart], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = file.name.replace(/\.pdf$/i, "_unlocked.pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * 格式化文件大小。
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
