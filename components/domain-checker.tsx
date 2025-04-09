'use client';

import { useState, useEffect } from 'react';
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Kbd } from '@heroui/kbd';
import { Tabs, Tab } from '@heroui/tabs';
import { Select, SelectItem } from '@heroui/select';

interface WhoisResponse {
  domain: string;
  isRegistered: boolean;
  whoisData: any;
  error?: string;
}

interface PositionConfig {
  type: 'number' | 'letter';
  value?: string;
}

interface BatchQueryConfig {
  prefix: string;
  suffix: string;
  positions: PositionConfig[];
  useConsecutive: boolean;
}

export function DomainChecker() {
  const [queryType, setQueryType] = useState<'single' | 'batch'>('single');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisResponse | null>(null);
  const [error, setError] = useState('');
  
  // 批量查询状态
  const [batchConfig, setBatchConfig] = useState<BatchQueryConfig>({
    prefix: '',
    suffix: '',
    positions: [{ type: 'number' }],
    useConsecutive: false
  });

  // 检查是否所有位置都是数字
  const isAllNumbers = () => batchConfig.positions.every(pos => pos.type === 'number');

  // 检查是否有连续的数字（用于6位数的情况）
  const hasConsecutiveNumbers = (str: string): boolean => {
    if (str.length !== 6) return true;
    const nums = str.split('').map(Number);
    for (let i = 0; i < nums.length - 2; i++) {
      if (nums[i + 1] === nums[i] + 1 && nums[i + 2] === nums[i] + 2) {
        return true;
      }
    }
    return false;
  };
  const [batchResults, setBatchResults] = useState<WhoisResponse[]>([]);
  const [progress, setProgress] = useState(0);

  // 生成域名组合
  const generateDomains = () => {
    const domains: string[] = [];
    const { prefix, suffix, positions, useConsecutive } = batchConfig;

    const generateCombinations = (current: string, index: number) => {
      if (index === positions.length) {
        if (positions.length === 6 && isAllNumbers()) {
          // 6位数字时检查是否有至少3个连续数字
          if (!hasConsecutiveNumbers(current)) {
            return;
          }
        }
        const domainPrefix = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix;
        domains.push(`${domainPrefix}${current}.${suffix}`);
        return;
      }

      const pos = positions[index];
      if (pos.type === 'number') {
        for (let i = 0; i <= 9; i++) {
          if (useConsecutive && isAllNumbers()) {
            // 处理顺子号逻辑
            if (index > 0) {
              const prevNum = parseInt(current[index - 1]);
              if (i !== (prevNum + 1) % 10) continue;
            }
          }
          generateCombinations(current + i, index + 1);
        }
      } else {
        // 字母生成
        for (let i = 0; i < 26; i++) {
          const letter = String.fromCharCode(65 + i); // 使用大写字母
          generateCombinations(current + letter, index + 1);
        }
      }
    };

    generateCombinations('', 0);
    return domains;
  };

  // 预览域名列表
  const [previewDomains, setPreviewDomains] = useState<string[]>([]);

  // 更新预览域名列表
  const updatePreviewDomains = () => {
    const domains = generateDomains();
    setPreviewDomains(domains);
  };

  // 当配置改变时更新预览
  useEffect(() => {
    if (batchConfig.prefix && batchConfig.suffix) {
      updatePreviewDomains();
    } else {
      setPreviewDomains([]);
    }
  }, [batchConfig]);

  // 批量查询处理
  const handleBatchQuery = async () => {
    setLoading(true);
    setError('');
    setBatchResults([]);
    setProgress(0);

    const domains = previewDomains;
    const results: WhoisResponse[] = [];

    for (let i = 0; i < domains.length; i++) {
      try {
        const response = await fetch('/api/whois', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ domain: domains[i] }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || '查询失败');
        }

        results.push(data);
        setProgress(((i + 1) / domains.length) * 100);
        setBatchResults([...results]);

        // 添加延迟以避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`查询域名 ${domains[i]} 失败:`, err);
      }
    }

    setLoading(false);
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '查询失败');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: 'single' | 'batch') => {
    console.log('handleTabChange',value);
    setQueryType(value);
    // 重置状态
    setError('');
    setResult(null);
    setBatchResults([]);
    setProgress(0);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <Tabs value={queryType} onValueChange={handleTabChange}>
        <Tab value="single" title="单个查询" >
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
                <div className="flex items-center justify-between">
                  {' '}
                  {/* 使用 justify-between 布局 */}
                  <div>
                    <span className="font-semibold text-lg">域名状态：</span>
                    {/* 调整字体大小和加粗 */}
                    <span
                      className={`ml-2 px-3 py-1 text-sm rounded-full ${
                        result.isRegistered ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                      }`}
                    >
                  {result.isRegistered ? '已被注册' : '可以注册'}
                </span>
                  </div>
                  <span className="text-gray-500 text-sm">域名: {result.domain}</span>
                  {/* 显示域名 */}
                </div>

                {result.whoisData && (
                  <div className="space-y-3">
                    {' '}
                    {/* 调整子元素的间距 */}
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
        <Tab value="batch" title="批量查询" >
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                value={batchConfig.prefix}
                onChange={(e) => setBatchConfig({ ...batchConfig, prefix: e.target.value })}
                placeholder="域名前缀"
                disabled={loading}
              />
              <Input
                value={batchConfig.suffix}
                onChange={(e) => setBatchConfig({ ...batchConfig, suffix: e.target.value })}
                placeholder="域名后缀 (例如: com)"
                disabled={loading}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {batchConfig.positions.map((pos, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Select
                    value={pos.type}
                    onValueChange={(value) => {
                      const newPositions = [...batchConfig.positions];
                      newPositions[index] = { type: value as 'number' | 'letter' };
                      setBatchConfig({ ...batchConfig, positions: newPositions });
                    }}
                    disabled={loading}
                    className="w-24"
                  >
                    <SelectItem value="number">数字</SelectItem>
                    <SelectItem value="letter">字母</SelectItem>
                  </Select>
                </div>
              ))}
              {batchConfig.positions.length < 6 && (
                <Button
                  onClick={() => setBatchConfig({
                    ...batchConfig,
                    positions: [...batchConfig.positions, { type: 'number' }]
                  })}
                  disabled={loading}
                  className="px-2 py-1"
                >
                  +
                </Button>
              )}
              {batchConfig.positions.length > 1 && (
                <Button
                  onClick={() => setBatchConfig({
                    ...batchConfig,
                    positions: batchConfig.positions.slice(0, -1)
                  })}
                  disabled={loading}
                  className="px-2 py-1"
                >
                  -
                </Button>
              )}
            </div>

            {isAllNumbers() && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={batchConfig.useConsecutive}
                  onChange={(e) => setBatchConfig({ ...batchConfig, useConsecutive: e.target.checked })}
                  disabled={loading}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="text-sm text-gray-600">使用顺子号</span>
              </div>
            )}

            <Button
              onClick={handleBatchQuery}
              color="primary"
              isLoading={loading}
              disabled={!batchConfig.prefix || !batchConfig.suffix || loading}
              className="w-full"
            >
              开始批量查询
            </Button>

            {/* 域名预览列表 */}
            {previewDomains.length > 0 && (
              <div className="p-4 bg-gray-100 border border-gray-200 rounded-lg shadow-sm">
                <div className="font-medium mb-2 text-gray-700">将要查询的域名列表：</div>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-white p-3 rounded">
                  {previewDomains.map((domain, index) => (
                    <div key={index} className="text-sm text-gray-600 hover:bg-gray-50 p-1 rounded">
                      {domain}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div className="text-xs font-semibold text-blue-600">
                    查询进度: {Math.round(progress)}%
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                  <div
                    style={{ width: `${progress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                  />
                </div>
              </div>
            )}

            {batchResults.length > 0 && (
              <div className="space-y-4">
                {batchResults.map((result, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.domain}</span>
                      <span
                        className={`px-2 py-1 text-sm rounded ${result.isRegistered ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                      >
                      {result.isRegistered ? '已被注册' : '可以注册'}
                    </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </Tab>
      </Tabs>

    </div>
  );
}
