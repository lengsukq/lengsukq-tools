/**
 * 域名验证工具函数
 */

/**
 * 校验单个域名标签（label）是否合法。
 * 例如 "example.com" 中的 "example" 或 "com"。
 * 遵循 RFC 952 和 RFC 1123 规范，长度1-63，只能包含字母、数字、连字符，
 * 且不能以连字符开头或结尾。
 */
export const isValidDomainPart = (part: string): boolean => {
  if (!part || part.length === 0 || part.length > 63) {
    return false;
  }

  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,6}[a-zA-Z0-9])?$/.test(part);
};
