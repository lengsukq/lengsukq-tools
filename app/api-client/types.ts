/**
 * API 客户端类型定义
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

export interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiRequest {
  method: HttpMethod;
  url: string;
  queryParams: QueryParam[];
  headers: Header[];
  body: string;
  bodyType: "json" | "text" | "form-urlencoded" | "form-data";
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  url: string;
  time?: number;
}

export interface RequestHistory {
  id: string;
  name: string;
  request: ApiRequest;
  timestamp: number;
}
