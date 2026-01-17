/**
 * PDF 水印去除工具的类型定义
 */

export interface ProcessedFile {
  name: string;
  pdfBytes: Uint8Array;
  pages: number;
}
