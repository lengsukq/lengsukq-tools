import { DomainFilterOption } from "./types";

/**
 * 域名过滤选项配置
 */
export const DOMAIN_FILTER_OPTIONS: DomainFilterOption[] = [
  { key: "none", label: "无" },
  { key: "AB", label: "AB (两种字符)" },
  { key: "ABC", label: "ABC (三种字符)" },
  { key: "AAA", label: "AAA" },
  { key: "ABBBA", label: "ABBBA" },
  { key: "ABCABC", label: "ABCABC" },
  { key: "ABBBBA", label: "ABBBBA" },
  { key: "AA", label: "AA" },
  { key: "ABCDEE", label: "ABCDEE" },
  { key: "useConsecutive", label: "顺子" },
  { key: "useAABB", label: "AABB" },
  { key: "useAABBCC", label: "AABBCC" },
  { key: "useABA", label: "ABA" },
  { key: "useABCBA", label: "ABCBA" },
  { key: "useABCCBA", label: "ABCCBA" },
  { key: "useABCCAB", label: "ABCCAB" },
];

/**
 * 列表渲染配置
 */
export const LIST_CONFIG = {
  ROW_HEIGHT: 24,
  MAX_HEIGHT: 160,
  MAX_POSITIONS: 6,
  MIN_POSITIONS: 1,
  MIN_THREAD_COUNT: 1,
  MAX_THREAD_COUNT: 30,
  DEFAULT_THREAD_COUNT: 10,
} as const;
