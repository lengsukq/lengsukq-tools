/**
 * localStorage 工具函数
 */

/**
 * 保存值到 localStorage
 */
export const saveToStorage = (key: string, value: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, value);
  }
};

/**
 * 从 localStorage 读取值
 */
export const loadFromStorage = (key: string, defaultValue: string = ""): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key) || defaultValue;
  }
  return defaultValue;
};
