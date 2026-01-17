/**
 * 工资计算工具函数
 */

/**
 * 计算个人所得税（使用速算扣除数优化）
 */
export const calculateIncomeTax = (taxableIncomeBase: number): number => {
  const TAX_THRESHOLD = 5000;

  if (taxableIncomeBase <= TAX_THRESHOLD) {
    return 0;
  }

  const taxableAmount = taxableIncomeBase - TAX_THRESHOLD;

  // 个人所得税税率表及速算扣除数（2023年标准）
  if (taxableAmount <= 3000) {
    return taxableAmount * 0.03 - 0;
  } else if (taxableAmount <= 12000) {
    return taxableAmount * 0.1 - 210;
  } else if (taxableAmount <= 25000) {
    return taxableAmount * 0.2 - 1410;
  } else if (taxableAmount <= 35000) {
    return taxableAmount * 0.25 - 2760;
  } else if (taxableAmount <= 55000) {
    return taxableAmount * 0.3 - 5290;
  } else if (taxableAmount <= 80000) {
    return taxableAmount * 0.35 - 15160;
  } else {
    return taxableAmount * 0.45 - 28160;
  }
};

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
