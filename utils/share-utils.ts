/**
 * 分享相关的工具函数
 */

/**
 * 编码内容为 Base64 URL 参数
 */
export const encodeShareContent = (content: string): string => {
  return btoa(encodeURIComponent(content));
};

/**
 * 解码 Base64 URL 参数为内容
 */
export const decodeShareContent = (encoded: string): string => {
  return decodeURIComponent(atob(encoded));
};

/**
 * 生成分享 URL
 */
export const generateShareUrl = (content: string, baseUrl: string): string => {
  const encodedContent = encodeShareContent(content);
  const url = new URL(baseUrl);
  url.searchParams.delete("shared");
  url.searchParams.set("shared", encodedContent);
  return url.toString();
};

/**
 * 从 URL 获取分享内容
 */
export const getShareContentFromUrl = (): string | null => {
  if (typeof window === "undefined") return null;

  const urlParams = new URLSearchParams(window.location.search);
  const sharedData = urlParams.get("shared");

  if (!sharedData) return null;

  try {
    return decodeShareContent(sharedData);
  } catch (error) {
    console.error("加载分享内容失败:", error);
    return null;
  }
};
