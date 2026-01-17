/**
 * WHOIS API 调用工具函数
 */

import { WhoisResponse } from "@/components/domain-checker/types";

const QUERY_DELAY_MS = 1000; // 批量查询时的延迟时间

/**
 * 查询单个域名的 WHOIS 信息
 */
export const queryWhois = async (domain: string): Promise<WhoisResponse> => {
  const response = await fetch("/api/whois", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domain }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || "查询失败");
  }

  return await response.json();
};

/**
 * 批量查询域名 WHOIS 信息
 */
export const batchQueryWhois = async (
  domains: string[],
): Promise<WhoisResponse[]> => {
  const results: WhoisResponse[] = [];

  for (const domain of domains) {
    try {
      const data = await queryWhois(domain);
      results.push(data);
      await new Promise((resolve) => setTimeout(resolve, QUERY_DELAY_MS));
    } catch (err) {
      results.push({
        domain: domain,
        isRegistered: false,
        whoisData: null,
        error: err instanceof Error ? err.message : "查询失败",
      });
    }
  }

  return results;
};
