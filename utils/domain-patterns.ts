/**
 * 域名模式检查工具函数
 * 用于检查域名字符串是否符合特定的数字或字符模式
 */

/**
 * 检查字符串中包含的**不同数字字符**的数量是否等于给定值。
 * @param str 待检查的字符串
 * @param count 期望的不同数字字符的数量
 * @returns 如果不同数字字符的数量等于 count，则返回 true
 */
export const hasUniqueDigitCount = (str: string, count: number): boolean => {
  const digits = str.split("").filter((char) => /^\d$/.test(char));

  if (digits.length === 0 && count === 0) return true;

  const uniqueDigits = new Set(digits);

  return uniqueDigits.size === count;
};

/**
 * 检查是否包含 AAA 模式（三个连续相同数字）
 */
export const hasAAA = (str: string): boolean => {
  if (str.length < 3) return false;
  for (let i = 0; i <= str.length - 3; i++) {
    if (
      str[i] === str[i + 1] &&
      str[i + 1] === str[i + 2] &&
      /^\d$/.test(str[i])
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含 ABBBA 模式
 */
export const hasABBBA = (str: string): boolean => {
  if (str.length < 5) return false;
  for (let i = 0; i <= str.length - 5; i++) {
    const char0 = str[i];
    const char1 = str[i + 1];
    const char2 = str[i + 2];
    const char3 = str[i + 3];
    const char4 = str[i + 4];

    if (
      /^\d$/.test(char0) &&
      /^\d$/.test(char1) &&
      /^\d$/.test(char2) &&
      /^\d$/.test(char3) &&
      /^\d$/.test(char4) &&
      char0 === char4 &&
      char1 === char2 &&
      char2 === char3
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含 ABCABC 模式
 */
export const hasABCABC = (str: string): boolean => {
  if (str.length < 6) return false;
  for (let i = 0; i <= str.length - 6; i++) {
    const char0 = str[i];
    const char1 = str[i + 1];
    const char2 = str[i + 2];
    const char3 = str[i + 3];
    const char4 = str[i + 4];
    const char5 = str[i + 5];

    if (
      /^\d$/.test(char0) &&
      /^\d$/.test(char1) &&
      /^\d$/.test(char2) &&
      /^\d$/.test(char3) &&
      /^\d$/.test(char4) &&
      /^\d$/.test(char5) &&
      char0 === char3 &&
      char1 === char4 &&
      char2 === char5
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含 ABBBBA 模式
 */
export const hasABBBBA = (str: string): boolean => {
  if (str.length < 6) return false;
  for (let i = 0; i <= str.length - 6; i++) {
    const char0 = str[i];
    const char1 = str[i + 1];
    const char2 = str[i + 2];
    const char3 = str[i + 3];
    const char4 = str[i + 4];
    const char5 = str[i + 5];

    if (
      /^\d$/.test(char0) &&
      /^\d$/.test(char1) &&
      /^\d$/.test(char2) &&
      /^\d$/.test(char3) &&
      /^\d$/.test(char4) &&
      /^\d$/.test(char5) &&
      char0 === char5 &&
      char1 === char2 &&
      char2 === char3 &&
      char3 === char4
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含连续数字（顺子）
 */
export const hasConsecutiveNumbers = (str: string): boolean => {
  if (str.length < 3) return false;
  for (let i = 0; i <= str.length - 3; i++) {
    const num1 = parseInt(str[i]);
    const num2 = parseInt(str[i + 1]);
    const num3 = parseInt(str[i + 2]);

    if (
      !isNaN(num1) &&
      !isNaN(num2) &&
      !isNaN(num3) &&
      num2 === (num1 + 1) % 10 &&
      num3 === (num2 + 1) % 10
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含 AA 模式（两个连续相同字符）
 */
export const hasAA = (str: string): boolean => {
  if (str.length < 2) return false;
  for (let i = 0; i <= str.length - 2; i++) {
    if (str[i] === str[i + 1]) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含 AABB 模式
 */
export const hasAABB = (str: string): boolean => {
  if (str.length < 4) return false;
  for (let i = 0; i <= str.length - 4; i++) {
    if (str[i] === str[i + 1] && str[i + 2] === str[i + 3]) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含 AABBCC 模式
 */
export const hasAABBCC = (str: string): boolean => {
  if (str.length < 6) return false;
  for (let i = 0; i <= str.length - 6; i++) {
    const sub = str.substring(i, i + 6);

    if (sub[0] === sub[1] && sub[2] === sub[3] && sub[4] === sub[5])
      return true;
  }

  return false;
};

/**
 * 检查是否包含 ABA 模式
 */
export const hasABA = (str: string): boolean => {
  if (str.length < 3) return false;
  for (let i = 0; i <= str.length - 3; i++) {
    if (
      str[i] === str[i + 2] &&
      /^\d$/.test(str[i]) &&
      /^\d$/.test(str[i + 1])
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含 ABCBA 模式（回文）
 */
export const hasABCBA = (str: string): boolean => {
  if (str.length < 5) return false;
  for (let i = 0; i <= str.length - 5; i++) {
    const char0 = str[i];
    const char1 = str[i + 1];
    const char2 = str[i + 2];
    const char3 = str[i + 3];
    const char4 = str[i + 4];

    if (
      /^\d$/.test(char0) &&
      /^\d$/.test(char1) &&
      /^\d$/.test(char2) &&
      /^\d$/.test(char3) &&
      /^\d$/.test(char4) &&
      char0 === char4 &&
      char1 === char3
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含 ABCCBA 模式
 */
export const hasABCCBA = (str: string): boolean => {
  if (str.length < 6) return false;
  for (let i = 0; i <= str.length - 6; i++) {
    const char0 = str[i];
    const char1 = str[i + 1];
    const char2 = str[i + 2];
    const char3 = str[i + 3];
    const char4 = str[i + 4];
    const char5 = str[i + 5];

    if (
      /^\d$/.test(char0) &&
      /^\d$/.test(char1) &&
      /^\d$/.test(char2) &&
      /^\d$/.test(char3) &&
      /^\d$/.test(char4) &&
      /^\d$/.test(char5) &&
      char0 === char5 &&
      char1 === char4 &&
      char2 === char3
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含 ABCCAB 模式
 */
export const hasABCCAB = (str: string): boolean => {
  if (str.length < 6) return false;
  for (let i = 0; i <= str.length - 6; i++) {
    const char0 = str[i];
    const char1 = str[i + 1];
    const char2 = str[i + 2];
    const char3 = str[i + 3];
    const char4 = str[i + 4];
    const char5 = str[i + 5];

    if (
      /^\d$/.test(char0) &&
      /^\d$/.test(char1) &&
      /^\d$/.test(char2) &&
      /^\d$/.test(char3) &&
      /^\d$/.test(char4) &&
      /^\d$/.test(char5) &&
      char0 === char4 &&
      char1 === char5 &&
      char2 === char3
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 检查是否包含 ABCDEE 模式（前四个连续递增，后两个相同）
 */
export const hasABCDEE = (str: string): boolean => {
  if (str.length < 6) return false;
  for (let i = 0; i <= str.length - 6; i++) {
    const char0 = str[i];
    const char1 = str[i + 1];
    const char2 = str[i + 2];
    const char3 = str[i + 3];
    const char4 = str[i + 4];
    const char5 = str[i + 5];

    if (
      /^\d$/.test(char0) &&
      /^\d$/.test(char1) &&
      /^\d$/.test(char2) &&
      /^\d$/.test(char3) &&
      /^\d$/.test(char4) &&
      /^\d$/.test(char5) &&
      parseInt(char0) + 1 === parseInt(char1) &&
      parseInt(char1) + 1 === parseInt(char2) &&
      parseInt(char2) + 1 === parseInt(char3) &&
      parseInt(char3) + 1 === parseInt(char4) &&
      char4 === char5
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 根据过滤器键名应用对应的模式检查
 */
export const applyDomainFilter = (
  str: string,
  filterKey: string | null,
): boolean => {
  if (!filterKey || filterKey === "none") return true;

  switch (filterKey) {
    case "useConsecutive":
      return hasConsecutiveNumbers(str);
    case "AA":
      return hasAA(str);
    case "AAA":
      return hasAAA(str);
    case "useAABB":
      return hasAABB(str);
    case "useAABBCC":
      return hasAABBCC(str);
    case "useABA":
      return hasABA(str);
    case "useABCBA":
      return hasABCBA(str);
    case "useABCCBA":
      return hasABCCBA(str);
    case "useABCCAB":
      return hasABCCAB(str);
    case "ABBBA":
      return hasABBBA(str);
    case "ABCABC":
      return hasABCABC(str);
    case "ABBBBA":
      return hasABBBBA(str);
    case "AB":
      return hasUniqueDigitCount(str, 2);
    case "ABC":
      return hasUniqueDigitCount(str, 3);
    case "ABCDEE":
      return hasABCDEE(str);
    default:
      return true;
  }
};
