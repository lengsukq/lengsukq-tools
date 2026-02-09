export interface ShareHistoryItem {
  id: string;
  type: "short-link" | "markdown";
  shortUrl: string;
  originalUrl?: string;
  contentPreview?: string;
  customCode?: string;
  createdAt: string;
  expiresAt?: string;
}

const SHORT_LINK_HISTORY_KEY = "short-link-history";
const MARKDOWN_HISTORY_KEY = "markdown-share-history";
const MAX_HISTORY_ITEMS = 50;

function getHistoryKey(type: "short-link" | "markdown"): string {
  return type === "short-link" ? SHORT_LINK_HISTORY_KEY : MARKDOWN_HISTORY_KEY;
}

export function getShareHistory(
  type: "short-link" | "markdown",
): ShareHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const key = getHistoryKey(type);
    const data = localStorage.getItem(key);
    if (!data) return [];

    const history: ShareHistoryItem[] = JSON.parse(data);
    // 按创建时间倒序排列
    return history.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (error) {
    console.error("读取分享历史失败:", error);
    return [];
  }
}

export function addShareHistory(
  item: Omit<ShareHistoryItem, "id" | "createdAt">,
): ShareHistoryItem {
  if (typeof window === "undefined") {
    return {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...item,
    };
  }

  try {
    const key = getHistoryKey(item.type);
    const history = getShareHistory(item.type);

    const newItem: ShareHistoryItem = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...item,
    };

    // 检查是否已存在相同的短链接，如果存在则更新
    const existingIndex = history.findIndex((h) => h.shortUrl === item.shortUrl);
    if (existingIndex >= 0) {
      history[existingIndex] = newItem;
    } else {
      history.unshift(newItem);
    }

    // 限制历史记录数量
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(key, JSON.stringify(trimmedHistory));

    return newItem;
  } catch (error) {
    console.error("保存分享历史失败:", error);
    return {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...item,
    };
  }
}

export function deleteShareHistory(
  type: "short-link" | "markdown",
  id: string,
): boolean {
  if (typeof window === "undefined") return false;

  try {
    const key = getHistoryKey(type);
    const history = getShareHistory(type);
    const filteredHistory = history.filter((item) => item.id !== id);

    localStorage.setItem(key, JSON.stringify(filteredHistory));
    return true;
  } catch (error) {
    console.error("删除分享历史失败:", error);
    return false;
  }
}

export function clearShareHistory(
  type: "short-link" | "markdown",
): boolean {
  if (typeof window === "undefined") return false;

  try {
    const key = getHistoryKey(type);
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error("清空分享历史失败:", error);
    return false;
  }
}

export function getHistoryStats(type: "short-link" | "markdown"): {
  total: number;
  expired: number;
} {
  const history = getShareHistory(type);
  const now = new Date();

  return {
    total: history.length,
    expired: history.filter((item) => {
      if (!item.expiresAt) return false;
      return new Date(item.expiresAt) < now;
    }).length,
  };
}