import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Select, SelectItem } from '@heroui/select';
import { WhoisResponse } from './domain-checker';
import { FixedSizeList as _FixedSizeList } from "react-window";
import { NumberInput } from "@heroui/number-input";
const FixedSizeList = _FixedSizeList as any;

interface PositionConfig {
    type: 'number' | 'letter' | 'input';
    value?: string;
}

interface BatchQueryProps {
    suffix: string;
    onQuery: (domains: string[]) => Promise<WhoisResponse[]>;
}

export function BatchQuery({ suffix, onQuery }: BatchQueryProps) {
    const [batchConfig, setBatchConfig] = useState<{
        positions: PositionConfig[];
        useConsecutive: boolean;
        useAABB: boolean;
        useAABBCC: boolean;
        threadCount: number;
        domainFilters: string[];
    }>({
        positions: [{ type: 'number' }],
        useConsecutive: false,
        useAABB: false,
        useAABBCC: false,
        threadCount: 1,
        domainFilters: [],
    });
    const [previewDomains, setPreviewDomains] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [batchResults, setBatchResults] = useState<WhoisResponse[]>([]);

    // 新增：停止查询的标志
    const [isStopped, setIsStopped] = useState(false);

    // 新增：关键字模糊查询的状态
    const [filterKeyword, setFilterKeyword] = useState('');

    const rowHeight = 24;
    const maxListHeight = 160;

    const domainFilterOptions = [
        { key: 'AA', label: 'AA' },
        { key: 'ABCDEE', label: 'ABCDEE' },
        { key: 'useConsecutive', label: '顺子' },
        { key: 'useAABB', label: 'AABB' },
        { key: 'useAABBCC', label: 'AABBCC' },
    ];

    // 检查是否所有位置都是数字
    const isAllNumbers = useCallback(() => batchConfig.positions.every(pos => pos.type === 'number' || (pos.type === 'input' && /^\d+$/.test(pos.value || ''))), [batchConfig.positions]);

    // 检查是否有任意三个连续的数字
    const hasConsecutiveNumbers = (str: string): boolean => {
        if (str.length < 3) return false;
        for (let i = 0; i <= str.length - 3; i++) {
            const num1 = parseInt(str[i]);
            const num2 = parseInt(str[i + 1]);
            const num3 = parseInt(str[i + 2]);
            if (num2 === (num1 + 1) % 10 && num3 === (num2 + 1) % 10) {
                return true;
            }
        }
        return false;
    };

    // 检查是否包含连续两个相同字符（AA, 11, etc.）
    const hasAA = (str: string): boolean => {
        if (str.length < 2) return false;
        for (let i = 0; i <= str.length - 2; i++) {
            if (str[i] === str[i + 1]) {
                return true;
            }
        }
        return false;
    };

    const hasAABB = (str: string): boolean => {
        if (str.length < 4) return false;
        for (let i = 0; i <= str.length - 4; i++) {
            if (str[i] === str[i + 1] && str[i + 2] === str[i + 3]) {
                return true;
            }
        }
        return false;
    }

    const hasAABBCC = (str: string): boolean => {
        if (str.length < 6) return false;
        for (let i = 0; i <= str.length - 6; i++) {
            const sub = str.substring(i, i + 6);
            if (
              sub[0] === sub[1] &&
              sub[2] === sub[3] &&
              sub[4] === sub[5]
            ) return true;
        }
        return false;
    }

    const hasABCDEE = (str: string): boolean => {
        if (str.length < 6) return false;
        for (let i = 0; i <= str.length - 6; i++) {
            const char0 = str[i];
            const char1 = str[i + 1];
            const char2 = str[i + 2];
            const char3 = str[i + 3];
            const char4 = str[i + 4];
            const char5 = str[i + 5];

            if (
              /^\d$/.test(char0) && /^\d$/.test(char1) && /^\d$/.test(char2) &&
              /^\d$/.test(char3) && /^\d$/.test(char4) && /^\d$/.test(char5) &&
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
    }

    // 生成域名组合
    const generateDomains = useCallback(() => {
        const domains: string[] = [];
        const { positions, domainFilters } = batchConfig;

        const generateCombinations = (current: string, index: number) => {
            if (index === positions.length) {
                // 筛选逻辑
                if (isAllNumbers()) {
                    if (domainFilters.includes('useConsecutive') && !hasConsecutiveNumbers(current)) {
                        return;
                    }
                    if (domainFilters.includes('AA') && !hasAA(current)) {
                        return;
                    }
                    if (domainFilters.includes('useAABB') && !hasAABB(current)) {
                        return;
                    }
                    if (domainFilters.includes('useAABBCC') && !hasAABBCC(current)) {
                        return;
                    }
                    if (domainFilters.includes('ABCDEE') && !hasABCDEE(current)) {
                        return;
                    }
                }

                domains.push(`${current}.${suffix}`);
                return;
            }

            const pos = positions[index];
            if (pos.type === 'number') {
                for (let i = 0; i <= 9; i++) {
                    generateCombinations(current + i, index + 1);
                }
            } else if (pos.type === 'letter') {
                for (let i = 0; i < 26; i++) {
                    const letter = String.fromCharCode(97 + i); // 小写字母
                    generateCombinations(current + letter, index + 1);
                }
            } else if (pos.type === 'input' && pos.value) {
                generateCombinations(current + pos.value, index + 1);
            }
        };

        generateCombinations('', 0);
        return domains;
    }, [batchConfig, suffix, isAllNumbers]); // 依赖项

    // 更新预览域名列表
    const updatePreviewDomains = useCallback(() => {
        const domains = generateDomains();
        setPreviewDomains(domains);
    }, [generateDomains]);

    // 当配置改变时更新预览
    useEffect(() => {
        updatePreviewDomains();
    }, [updatePreviewDomains]);

    const handleBatchQuery = async () => {
        if (!suffix) {
            alert('请填写域名后缀');
            return;
        }

        setLoading(true);
        setBatchResults([]);
        setProgress(0);
        setIsStopped(false); // 重置停止状态

        const domains = previewDomains;
        const totalDomains = domains.length;
        const threadCount = Math.min(Math.max(1, Math.floor(batchConfig.threadCount)), 10);
        let completedCount = 0;

        const queryInChunks = async (startIndex: number, endIndex: number) => {
            const chunkDomains = domains.slice(startIndex, endIndex);
            for (let i = 0; i < chunkDomains.length; i++) {
                if (isStopped) { // 检查停止标志
                    console.log('查询已停止');
                    return; // 提前退出当前线程的查询
                }
                const domain = chunkDomains[i];
                try {
                    const result = await onQuery([domain]);
                    const finalResult = Array.isArray(result) ? result : [result];
                    setBatchResults(prevResults => [...prevResults, ...finalResult]);
                } catch (error) {
                    console.error(`查询 ${domain} 出错`, error);
                    // setBatchResults(prevResults => [...prevResults, { domain, error: String(error), isRegistered: false }]);
                }
                completedCount++;
                setProgress(((completedCount / totalDomains) * 100));
            }
        };

        const threadPromises = [];
        let startIndex = 0;
        const domainsPerThread = Math.floor(totalDomains / threadCount);
        const remainingDomains = totalDomains % threadCount;

        for (let i = 0; i < threadCount; i++) {
            const endIndex = startIndex + domainsPerThread + (i < remainingDomains ? 1 : 0);
            threadPromises.push(queryInChunks(startIndex, endIndex));
            startIndex = endIndex;
        }

        await Promise.all(threadPromises);
        setLoading(false);
        setIsStopped(false); // 确保在查询完成时重置停止状态
    };

    // 停止查询的回调
    const handleStopQuery = () => {
        setIsStopped(true);
        setLoading(false); // 立即停止loading状态
        setProgress(0); // 重置进度条
    };

    // 渲染单个域名
    const renderDomainRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
        return (
          <div style={style} className="text-sm text-gray-600 hover:bg-gray-50 p-1 rounded">
              {previewDomains[index]}
          </div>
        );
    }, [previewDomains]);

    // 计算列表高度，确保不超过最大高度
    const listHeight = Math.min(previewDomains.length * rowHeight, maxListHeight);

    // 使用 useMemo 进行过滤，避免不必要的重复计算
    const filteredAvailableDomains = useMemo(() => {
        if (!filterKeyword) {
            return batchResults.filter(result => !result.isRegistered && !result.error);
        }
        const lowerCaseKeyword = filterKeyword.toLowerCase();
        return batchResults.filter(result =>
          !result.isRegistered &&
          !result.error &&
          result.domain.toLowerCase().includes(lowerCaseKeyword)
        );
    }, [batchResults, filterKeyword]);

    const filteredRegisteredDomains = useMemo(() => {
        if (!filterKeyword) {
            return batchResults.filter(result => result.isRegistered || result.error);
        }
        const lowerCaseKeyword = filterKeyword.toLowerCase();
        return batchResults.filter(result =>
          (result.isRegistered || result.error) &&
          result.domain.toLowerCase().includes(lowerCaseKeyword)
        );
    }, [batchResults, filterKeyword]);

    return (
      <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
              {batchConfig.positions.map((pos, index) => (
                <div key={index} className="flex gap-2 items-center">
                    <Select
                      selectedKeys={pos.type ? [pos.type] : []}
                      onChange={(e) => {
                          const value = e.target.value;
                          const newPositions = [...batchConfig.positions];
                          newPositions[index] = { ...pos, type: value as 'number' | 'letter' | 'input', value: '' };
                          setBatchConfig({ ...batchConfig, positions: newPositions });
                      }}
                      disabled={loading}
                      className="w-24"
                    >
                        <SelectItem key={"number"}>数字</SelectItem>
                        <SelectItem key={"letter"}>字母</SelectItem>
                        <SelectItem key={"input"}>自定义</SelectItem>
                    </Select>
                    {pos.type === 'input' && (
                      <Input
                        value={pos.value || ''}
                        onChange={(e) => {
                            const newPositions = [...batchConfig.positions];
                            newPositions[index] = { ...pos, value: e.target.value };
                            setBatchConfig({ ...batchConfig, positions: newPositions });
                        }}
                        className="w-24"
                        placeholder="输入内容"
                        disabled={loading}
                      />
                    )}
                </div>
              ))}

              {batchConfig.positions.length < 6 && (
                <Button
                  onClick={() =>
                    setBatchConfig({
                        ...batchConfig,
                        positions: [...batchConfig.positions, { type: 'number' }],
                    })
                  }
                  disabled={loading}
                  className="px-2 py-1"
                >
                    +
                </Button>
              )}

              {batchConfig.positions.length > 1 && (
                <Button
                  onClick={() =>
                    setBatchConfig({
                        ...batchConfig,
                        positions: batchConfig.positions.slice(0, -1),
                    })
                  }
                  disabled={loading}
                  className="px-2 py-1"
                >
                    -
                </Button>
              )}
          </div>

          {/* 域名筛选 */}
          {isAllNumbers() && (
            <div className="flex items-center gap-2">
                <Select
                  label="生成条件"
                  placeholder="请选择生成条件"
                  selectionMode="multiple"
                  selectedKeys={batchConfig.domainFilters}
                  onChange={(e) => {
                      const value = e.target.value;
                      setBatchConfig({
                          ...batchConfig,
                          domainFilters: Array.isArray(value) ? value : value ? value.split(',') : [],
                      });
                  }}
                  disabled={loading}
                  className="max-w-xs"
                >
                    {domainFilterOptions.map(option => (
                      <SelectItem key={option.key}>{option.label}</SelectItem>
                    ))}
                </Select>
            </div>
          )}

          {/* 新增：线程选择 */}
          <div className="flex items-center gap-2">
              <span>线程数:</span>
              <NumberInput
                value={batchConfig.threadCount}
                onChange={(value) => {
                    setBatchConfig({ ...batchConfig, threadCount: value as number });
                }}
                minValue={1}
                maxValue={10}
                className="w-20"
                disabled={loading}
              />
          </div>

          <div className="flex gap-2">
              <Button
                onClick={handleBatchQuery}
                color="primary"
                isLoading={loading}
                disabled={!suffix || loading}
                className="flex-grow"
              >
                  开始批量查询
              </Button>
              {loading && (
                <Button
                  onClick={handleStopQuery}
                  color="secondary"
                  disabled={!loading}
                  className="w-24"
                >
                    停止
                </Button>
              )}
          </div>

          {/* 域名预览列表 */}
          {previewDomains.length > 0 && (
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg shadow-sm">
                <div className="font-medium mb-2 text-gray-700">
                    将要查询的域名列表：({previewDomains.length} 个)
                </div>
                <div className="bg-gray-800 p-3 rounded">
                    <FixedSizeList
                      height={listHeight}
                      itemCount={previewDomains.length || 0}
                      itemSize={rowHeight}
                      overscanCount={10}
                      width="100%"
                    >
                        {renderDomainRow}
                    </FixedSizeList>
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

          {/* 结果筛选输入框 */}
          {(batchResults.length > 0 || filterKeyword) && (
            <div className="flex items-center gap-2">
                <Input
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  placeholder="在结果中模糊查询域名"
                  className="flex-grow"
                />
            </div>
          )}

          {/* Display results, available domains first, then registered domains */}
          {(filteredAvailableDomains.length > 0 || filteredRegisteredDomains.length > 0) && (
            <div className="space-y-4">
                {filteredAvailableDomains.length > 0 && (
                  <div>
                      <h3 className="text-lg font-semibold mb-2">可以注册的域名 ({filteredAvailableDomains.length} 个)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredAvailableDomains.map((result, index) => (
                            <div key={`available-${index}`} className="p-4 bg-green-800 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{result.domain}</span>
                                    <span className="px-2 py-1 text-sm rounded bg-green-200 text-green-800">可以注册</span>
                                </div>
                            </div>
                          ))}
                      </div>
                  </div>
                )}

                {filteredRegisteredDomains.length > 0 && (
                  <div>
                      <h3 className="text-lg font-semibold mb-2">已被注册的域名 ({filteredRegisteredDomains.length} 个)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredRegisteredDomains.map((result, index) => (
                            <div key={`registered-${index}`} className="p-4 bg-red-800 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{result.domain}</span>
                                    <span className="px-2 py-1 text-sm rounded text-red-200">
                                                {result.error ? result.error : '已被注册'}
                                            </span>
                                </div>
                            </div>
                          ))}
                      </div>
                  </div>
                )}
            </div>
          )}
      </div>
    );
}