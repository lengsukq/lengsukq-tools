/**
 * 域名检查器组件的类型定义
 */

export interface WhoisResponse {
  domain: string;
  isRegistered: boolean;
  whoisData: any;
  error?: string;
}
