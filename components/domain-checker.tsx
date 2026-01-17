"use client";

import { useState } from "react";
import { Input, Button, Kbd, Tabs, Tab } from "@heroui/react";

import { BatchQuery } from "./BatchQuery";
import { WhoisResponse } from "./domain-checker/types";
import { queryWhois, batchQueryWhois } from "@/utils/whois-api";
import { WhoisResultDisplay } from "./domain-checker/WhoisResultDisplay";

export type { WhoisResponse };

export function DomainChecker() {
  const [queryType, setQueryType] = useState<"single" | "batch">("single");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisResponse | null>(null);
  const [error, setError] = useState("");
  const [suffix, setSuffix] = useState("");

  const handleBatchQuery = async (
    domains: string[],
  ): Promise<WhoisResponse[]> => {
    return batchQueryWhois(domains);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await queryWhois(domain);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "查询失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: "single" | "batch") => {
    setQueryType(value);
    setError("");
    setResult(null);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs
        key={queryType}
        onSelectionChange={(key) => handleTabChange(key as "single" | "batch")}
      >
        <Tab key="single" title="单个查询">
          <form className="space-y-4 mt-4" onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                disabled={loading}
                placeholder="输入域名 (例如: example.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
              <Button
                color="primary"
                disabled={!domain || loading}
                isLoading={loading}
                type="submit"
              >
                查询
              </Button>
            </div>

            {error && (
              <div className="p-4 text-sm text-red-500 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            {result && <WhoisResultDisplay result={result} />}

            <div className="text-sm text-gray-500 text-center">
              按下 <Kbd keys={["enter"]} /> 快速查询
            </div>
          </form>
        </Tab>
        <Tab key="batch" title="批量查询">
          <div className="space-y-4 mt-4">
            <Input
              placeholder="域名后缀 (例如: com)"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
            />
            <BatchQuery suffix={suffix} onQuery={handleBatchQuery} />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
