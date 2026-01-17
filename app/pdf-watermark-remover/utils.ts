import { PDFDocument, rgb } from "pdf-lib";
import { WATERMARK_CONFIG, WATERMARK_COLOR } from "./constants";
import { ProcessedFile } from "./types";

/**
 * 处理单个 PDF 文件，去除右下角水印
 */
export const processSingleFile = async (file: File): Promise<ProcessedFile> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  // 处理每一页
  for (const page of pages) {
    const { width, height } = page.getSize();

    // 计算水印区域（右下角）
    const watermarkWidth = width * WATERMARK_CONFIG.WIDTH_RATIO;
    const watermarkHeight = height * WATERMARK_CONFIG.HEIGHT_RATIO;
    const watermarkX = width - watermarkWidth - WATERMARK_CONFIG.RIGHT_MARGIN;
    const watermarkY = WATERMARK_CONFIG.BOTTOM_MARGIN;

    // 用白色矩形覆盖水印区域
    page.drawRectangle({
      x: watermarkX,
      y: watermarkY,
      width: watermarkWidth,
      height: watermarkHeight,
      color: rgb(WATERMARK_COLOR.R, WATERMARK_COLOR.G, WATERMARK_COLOR.B),
      opacity: 1,
      borderWidth: 0,
    });
  }

  const modifiedPdfBytes = await pdfDoc.save();

  return {
    name: file.name,
    pdfBytes: modifiedPdfBytes,
    pages: pages.length,
  };
};

/**
 * 下载处理后的 PDF 文件
 */
export const downloadProcessedFile = (file: ProcessedFile): void => {
  const blob = new Blob([file.pdfBytes as BlobPart], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name.replace(".pdf", "_去水印.pdf");
  link.click();
  URL.revokeObjectURL(url);
};
