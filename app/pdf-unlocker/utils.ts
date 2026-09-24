import type { QpdfRunError, QpdfRunner } from "qpdf-run";
import type {
  ProcessedFile,
  UnlockError,
  UnlockErrorCode,
  UnlockProgress,
} from "./types";

import { isEncrypted as inspectPdfEncryption } from "@pdfsmaller/pdf-decrypt";
import { PDFDocument } from "pdf-lib";

const INPUT_FILE_NAME = "input.pdf";
const OUTPUT_FILE_NAME = "unlocked.pdf";
const QPDF_TIMEOUT_MS = 120_000;

type PasswordStatus = "accepted" | "not-encrypted" | "required";

interface ClassifiedError {
  code: UnlockErrorCode;
  message: string;
  requiresPassword: boolean;
}

class PdfUnlockFailure extends Error {
  readonly unlockCode: UnlockErrorCode;

  constructor(unlockCode: UnlockErrorCode, message: string) {
    super(message);
    this.name = "PdfUnlockFailure";
    this.unlockCode = unlockCode;
  }
}

/**
 * QPDF WASM 在部分错误密码场景会抛出底层数值异常，
 * 因此使用现有解析器读取 /Encrypt 字典作为后备判断。
 */
async function isEncryptedPdf(pdfBytes: Uint8Array): Promise<boolean> {
  try {
    return (await inspectPdfEncryption(pdfBytes)).encrypted;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "");

    // AES-128 等算法虽然不被旧解密器支持，但出现该错误说明文件确实已加密。
    if (/unsupported encryption/i.test(message)) {
      return true;
    }

    throw error;
  }
}

/**
 * 使用 QPDF 的 --requires-password 判断当前密码状态。
 * qpdf-run 要求声明输出文件，因此把输入文件本身作为只读返回值。
 */
async function getPasswordStatus(
  pdfBytes: Uint8Array,
  password: string,
  runner: QpdfRunner,
): Promise<PasswordStatus> {
  try {
    const result = await runner.run({
      inputs: {
        [INPUT_FILE_NAME]: pdfBytes,
      },
      args: [`--password=${password}`, "--requires-password", INPUT_FILE_NAME],
      outputs: [INPUT_FILE_NAME],
    });

    if (result.exitCode === 0) {
      return "required";
    }

    return "accepted";
  } catch (error) {
    const qpdfError = error as Partial<QpdfRunError> | undefined;

    // --requires-password 的退出码 2 表示文件未加密。
    if (qpdfError?.code === "QPDF_EXEC_FAILED" && qpdfError.exitCode === 2) {
      return "not-encrypted";
    }

    // 部分 AES-256 错误密码会从 WASM 抛出数值异常且没有标准退出码。
    // 此时检查 PDF 是否含 /Encrypt 字典：存在则说明当前密码仍不正确。
    if (await isEncryptedPdf(pdfBytes)) {
      return "required";
    }

    throw error;
  }
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
  const passwordStatus = await getPasswordStatus(pdfBytes, password, runner);

  if (passwordStatus === "required") {
    if (password.length > 0) {
      throw new PdfUnlockFailure(
        "INVALID_PASSWORD",
        "打开密码不正确，请检查后重试",
      );
    }

    throw new PdfUnlockFailure(
      "PASSWORD_REQUIRED",
      "此 PDF 设置了打开密码，请输入原密码后重试",
    );
  }

  const unlockedBytes =
    passwordStatus === "not-encrypted"
      ? pdfBytes
      : await runner.runOne({
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

  const pdfDoc = await PDFDocument.load(unlockedBytes, {
    updateMetadata: false,
  });

  return {
    name: file.name,
    pdfBytes: unlockedBytes,
    pages: pdfDoc.getPageCount(),
    originalSize: pdfBytes.length,
    unlockedSize: unlockedBytes.length,
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
    try {
      await runner?.destroy();
    } catch {
      // Worker 已经退出时无需再次上报销毁错误。
    }
  }

  return { success, errors };
}

function classifyUnlockError(
  error: unknown,
  passwordWasProvided: boolean,
): ClassifiedError {
  if (error instanceof PdfUnlockFailure) {
    return {
      code: error.unlockCode,
      message: error.message,
      requiresPassword:
        error.unlockCode === "PASSWORD_REQUIRED" ||
        error.unlockCode === "INVALID_PASSWORD",
    };
  }

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
