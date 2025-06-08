'use client';

import { useState, useEffect } from 'react';
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Kbd } from '@heroui/kbd';
import { Tabs, Tab } from '@heroui/tabs';
import { BatchQuery } from './BatchQuery'; // 确保路径正确

export interface WhoisResponse {
  domain: string;
  isRegistered: boolean;
  whoisData: any;
  error?: string;
}

export function DomainChecker() {
  const [queryType, setQueryType] = useState<'single' | 'batch'>('single');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisResponse | null>(null);
  const [error, setError] = useState('');
  const [suffix, setSuffix] = useState('');


  const handleBatchQuery = async (domains: string[]): Promise<WhoisResponse[]> => {
    const results: WhoisResponse[] = [];
    for (const domain of domains) {
      try {
        const response = await fetch('/api/whois', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ domain }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || '查询失败');
        }

        results.push(data);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 添加延迟
      } catch (err) {
        results.push({
          domain: domain,
          isRegistered: false,
          whoisData: null,
          error: err instanceof Error ? err.message : '查询失败',
        });
      }
    }
    return results;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/whois', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        const data = await response.json(); // 解析响应体
        throw new Error(data.message || '查询失败'); // 使用 data.message
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: 'single' | 'batch') => {
    setQueryType(value);
    setError('');
    setResult(null);
    setLoading(false);
  };

  return (
      <div className="w-full max-w-4xl mx-auto">
        <Tabs key={queryType}>
          <Tab key="single" title="单个查询">
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="输入域名 (例如: example.com)"
                    disabled={loading}
                    className="flex-1"
                />
                <Button
                    type="submit"
                    color="primary"
                    isLoading={loading}
                    disabled={!domain || loading}
                >
                  查询
                </Button>
              </div>

              {error && (
                  <div className="p-4 text-sm text-red-500 bg-red-50 rounded-lg">
                    {error}
                  </div>
              )}

              {result && (
                  <div className="p-4 space-y-4 bg-gray-50 rounded-lg shadow-md">
                    {/* 整体添加阴影 */}
                    <div className="flex items-center justify-between">  {/* 使用 justify-between 布局 */}
                      <div>
                        <span className="font-semibold text-lg">域名状态：</span>  {/* 调整字体大小和加粗 */}
                        <span
                            className={`ml-2 px-3 py-1 text-sm rounded-full ${result.isRegistered ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                            }`}
                        >
                                            {result.isRegistered ? '已被注册' : '可以注册'}
                                        </span>
                      </div>
                      <span className="text-gray-500 text-sm">域名: {result.domain}</span> {/* 显示域名 */}
                    </div>

                    {result.whoisData && (
                        <div className="space-y-3"> {/* 调整子元素的间距 */}
                          {/* DNS Servers */}
                          {result.whoisData['DNS Serve'] && (
                              <div>
                                <div className="font-medium text-gray-700">DNS 服务器</div>
                                <div className="text-sm text-gray-600">{result.whoisData['DNS Serve'].join(', ')}</div>
                              </div>
                          )}

                          {/* Registration Time */}
                          {result.whoisData['Registration Time'] && (
                              <div>
                                <div className="font-medium text-gray-700">注册时间</div>
                                <div className="text-sm text-gray-600">{result.whoisData['Registration Time']}</div>
                              </div>
                          )}

                          {/* Expiration Time */}
                          {result.whoisData['Expiration Time'] && (
                              <div>
                                <div className="font-medium text-gray-700">到期时间</div>
                                <div className="text-sm text-gray-600">{result.whoisData['Expiration Time']}</div>
                              </div>
                          )}

                          {/* Registrar URL */}
                          {result.whoisData['Registrar URL'] && (
                              <div>
                                <div className="font-medium text-gray-700">注册商</div>
                                <a
                                    href={result.whoisData['Registrar URL']}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm"
                                >
                                  {result.whoisData['Registrar URL']}
                                </a>
                              </div>
                          )}

                          {/* WHOIS Info */}
                          <div>
                            <div className="font-medium text-gray-700">WHOIS 信息</div>
                            <pre className="p-3 mt-2 text-xs bg-gray-100 rounded-lg overflow-x-auto text-gray-800">
                                                {JSON.stringify(result.whoisData, null, 2)}
                                            </pre>
                          </div>
                        </div>
                    )}
                  </div>
              )}

              <div className="text-sm text-gray-500 text-center">
                按下 <Kbd keys={['enter']} /> 快速查询
              </div>
            </form>
          </Tab>
          <Tab key="batch" title="批量查询">
            <div className="space-y-4 mt-4">
              <Input
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="域名后缀 (例如: com)"
              />
              <BatchQuery suffix={suffix} onQuery={handleBatchQuery} />
            </div>
          </Tab>
        </Tabs>
      </div>
  );
}
