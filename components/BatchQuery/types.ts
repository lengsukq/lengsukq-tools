/**
 * BatchQuery 组件的类型定义
 */

export interface PositionConfig {
  type: "number" | "letter" | "input";
  value?: string;
}

export interface BatchConfig {
  positions: PositionConfig[];
  threadCount: number;
  domainFilter: string | null;
}

export interface DomainFilterOption {
  key: string;
  label: string;
}
