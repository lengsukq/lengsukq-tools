/**
 * PDF 水印去除工具的常量配置
 */

export const WATERMARK_CONFIG = {
  WIDTH_RATIO: 1 / 3, // 水印宽度占页面宽度的比例
  HEIGHT_RATIO: 1 / 14, // 水印高度占页面高度的比例
  RIGHT_MARGIN: 10, // 右边距（px）
  BOTTOM_MARGIN: 6, // 底边距（px）
} as const;

export const WATERMARK_COLOR = {
  R: 1,
  G: 1,
  B: 1,
} as const; // 白色
