/**
 * 格式化工具函数
 */

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串，如 "1.23 MB"
 */
export function formatFileSize(bytes: number): string {
  const size = parseInt(String(bytes));
  if (size === 0) {
    return "0.00 B";
  } else if (size < 1024) {
    return size.toFixed(2) + " B";
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + " KB";
  } else if (size < 1024 * 1024 * 1024) {
    return (size / (1024 * 1024)).toFixed(2) + " MB";
  } else {
    return (size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }
}

/**
 * 格式化下载速度
 * @param bytesPerSecond 每秒字节数
 * @returns 格式化后的速度字符串，如 "1.23 MB/s"
 */
export function formatDownloadSpeed(bytesPerSecond: number): string {
  const formatted = formatFileSize(bytesPerSecond);
  return formatted.replace(/\s([K|M|G|B]*)B{0,1}/, "$1/s");
}

/**
 * 格式化时间（秒数）
 * @param seconds 秒数
 * @returns 格式化后的时间字符串，如 "01h23m45s"
 */
export function formatTime(seconds: number): string {
  let t = "";
  if (seconds > -1) {
    const hour = Math.floor(seconds / 3600);
    const min = Math.floor((seconds / 60) % 60);
    const sec = seconds % 60;

    if (hour > 0) {
      t += (hour < 10 ? "0" : "") + hour + "h";
    }
    if (hour > 0 || min > 0) {
      t += (min < 10 ? "0" : "") + min + "m";
    }
    t += (sec < 10 ? "0" : "") + sec + "s";
  }
  return t || "0s";
}
