import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Select, SelectItem } from '@heroui/select';
import { WhoisResponse } from './domain-checker';
import { FixedSizeList as _FixedSizeList } from "react-window";
import { NumberInput } from "@heroui/number-input";
// 导入 addToast 函数，现在明确它接受一个 color 属性
import { addToast } from "@heroui/toast";

const FixedSizeList = _FixedSizeList as any;

interface PositionConfig {
    type: 'number' | 'letter' | 'input';
    value?: string;
}

interface BatchQueryProps {
    suffix: string;
    onQuery: (domains: string[]) => Promise<WhoisResponse[]>;
}

/**
 * 校验单个域名标签（label）是否合法。
 * 例如 "example.com" 中的 "example" 或 "com"。
 * 遵循 RFC 952 和 RFC 1123 规范，长度1-63，只能包含字母、数字、连字符，
 * 且不能以连字符开头或结尾。
 */
const isValidDomainPart = (part: string): boolean => {
    if (!part || part.length === 0 || part.length > 63) {
        return false;
    }
    return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(part);
};

export function BatchQuery({ suffix, onQuery }: BatchQueryProps) {
    // 批量查询配置状态
    const [batchConfig, setBatchConfig] = useState<{
        positions: PositionConfig[]; // 域名生成位置配置
        useConsecutive: boolean;
        useAABB: boolean;
        useAABBCC: boolean;
        threadCount: number; // 查询线程数
        domainFilters: string[]; // 域名过滤条件
    }>({
        positions: [{ type: 'number' }],
        useConsecutive: false,
        useAABB: false,
        useAABBCC: false,
        threadCount: 1,
        domainFilters: [],
    });
    const [previewDomains, setPreviewDomains] = useState<string[]>([]); // 预览生成的域名列表
    const [loading, setLoading] = useState(false); // 查询加载状态
    const [progress, setProgress] = useState(0); // 查询进度
    const [batchResults, setBatchResults] = useState<WhoisResponse[]>([]); // 批量查询结果

    const [isStopped, setIsStopped] = useState(false); // 查询停止标志
    const [filterKeyword, setFilterKeyword] = useState(''); // 结果过滤关键词

    const rowHeight = 24;
    const maxListHeight = 160;

    const domainFilterOptions = [
        { key: 'AA', label: 'AA' },
        { key: 'ABCDEE', label: 'ABCDEE' },
        { key: 'useConsecutive', label: '顺子' },
        { key: 'useAABB', label: 'AABB' },
        { key: 'useAABBCC', label: 'AABBCC' },
    ];

    /**
     * 判断所有域名生成位置是否都为数字类型或自定义输入且内容为纯数字。
     * 用于决定是否显示数字相关的筛选条件。
     */
    const isAllNumbers = useCallback(() =>
        batchConfig.positions.every(pos => pos.type === 'number' || (pos.type === 'input' && /^\d+$/.test(pos.value || '')))
      , [batchConfig.positions]);

    // 以下是各种域名数字组合的辅助函数（顺子、AA、AABB、AABBCC、ABCDEE）
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

    /**
     * 根据当前配置生成预览域名列表。
     * 使用递归方法生成所有组合，并应用数字过滤器。
     */
    const generateDomains = useCallback(() => {
        const domains: string[] = [];
        const { positions, domainFilters } = batchConfig;

        const generateCombinations = (current: string, index: number) => {
            // 所有位置都已处理，生成一个完整域名
            if (index === positions.length) {
                // 如果是纯数字域名，才应用数字相关的过滤器
                if (isAllNumbers()) {
                    if (domainFilters.includes('useConsecutive') && !hasConsecutiveNumbers(current)) return;
                    if (domainFilters.includes('AA') && !hasAA(current)) return;
                    if (domainFilters.includes('useAABB') && !hasAABB(current)) return;
                    if (domainFilters.includes('useAABBCC') && !hasAABBCC(current)) return;
                    if (domainFilters.includes('ABCDEE') && !hasABCDEE(current)) return;
                }
                domains.push(`${current}.${suffix}`);
                return;
            }

            // 处理当前位置
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
    }, [batchConfig, suffix, isAllNumbers]);

    /** 更新预览域名列表的副作用 */
    const updatePreviewDomains = useCallback(() => {
        setPreviewDomains(generateDomains());
    }, [generateDomains]);

    useEffect(() => {
        updatePreviewDomains();
    }, [updatePreviewDomains]);

    /** 处理批量查询的主逻辑 */
    const handleBatchQuery = async () => {
        // 1. 前置校验：域名后缀是否填写
        if (!suffix) {
            addToast({
                title: "查询前提示",
                description: "请填写域名后缀。",
                color: "warning" // 使用 Warning 类型
            });
            return;
        }

        // 2. 校验域名后缀本身是否合法（作为一个域名标签）
        if (!isValidDomainPart(suffix)) {
            addToast({
                title: "校验错误",
                description: `域名后缀 '${suffix}' 不符合域名规范。`,
                color: "danger" // 使用 Danger 类型
            });
            return;
        }

        // 3. 校验所有生成的完整域名是否合法
        for (const fullDomain of previewDomains) {
            const domainLabels = fullDomain.split('.');

            // 至少需要一个主域名部分和一个后缀，所以至少两个标签
            if (domainLabels.length < 2) {
                addToast({
                    title: "校验错误",
                    description: `生成的域名 '${fullDomain}' 格式不完整，至少需要一个主域名和一个后缀。`,
                    color: "danger" // 使用 Danger 类型
                });
                return;
            }

            // 遍历所有标签，确保每个标签都合法且非空
            for (const label of domainLabels) {
                // 检查是否存在空标签（例如 `..` 会导致 split 结果中出现空字符串）
                if (label === '') {
                    addToast({
                        title: "校验错误",
                        description: `域名 '${fullDomain}' 包含空的域名部分 (例如 '..')，不符合域名规范。`,
                        color: "danger" // 使用 Danger 类型
                    });
                    return;
                }
                // 校验每个非空标签是否符合域名标签的规范
                if (!isValidDomainPart(label)) {
                    addToast({
                        title: "校验错误",
                        description: `域名 '${fullDomain}' 中的部分 '${label}' 不符合域名规范，请检查组合规则。`,
                        color: "danger" // 使用 Danger 类型
                    });
                    return;
                }
            }
        }

        // 开始查询，设置加载状态和进度
        setLoading(true);
        setBatchResults([]);
        setProgress(0);
        setIsStopped(false);

        const domains = previewDomains;
        const totalDomains = domains.length;
        const threadCount = Math.min(Math.max(1, Math.floor(batchConfig.threadCount)), 10); // 线程数限制在 1 到 10
        let completedCount = 0;

        // 并发查询函数，处理域名分块
        const queryInChunks = async (startIndex: number, endIndex: number) => {
            const chunkDomains = domains.slice(startIndex, endIndex);
            for (let i = 0; i < chunkDomains.length; i++) {
                if (isStopped) { // 检查停止标志
                    console.log('查询已停止');
                    return; // 退出当前线程
                }
                const domain = chunkDomains[i];
                try {
                    const result = await onQuery([domain]); // 执行查询
                    const finalResult = Array.isArray(result) ? result : [result];
                    setBatchResults(prevResults => [...prevResults, ...finalResult]);
                } catch (error) {
                    console.error(`查询 ${domain} 出错`, error);
                    // 记录查询错误，即使出错也显示在结果中
                    // setBatchResults(prevResults => [...prevResults, { domain, error: String(error), isRegistered: false }]);
                }
                completedCount++;
                setProgress(((completedCount / totalDomains) * 100)); // 更新进度
            }
        };

        // 创建并等待所有线程完成
        const threadPromises = [];
        let startIndex = 0;
        const domainsPerThread = Math.floor(totalDomains / threadCount);
        const remainingDomains = totalDomains % threadCount;

        for (let i = 0; i < threadCount; i++) {
            const endIndex = startIndex + domainsPerThread + (i < remainingDomains ? 1 : 0);
            threadPromises.push(queryInChunks(startIndex, endIndex));
            startIndex = endIndex;
        }

        await Promise.all(threadPromises); // 等待所有查询线程完成
        setLoading(false);
        setIsStopped(false);

        // 根据最终进度判断查询结果
        if (progress >= 99.9) { // 浮点数比较，用近似值判断是否完全完成
            addToast({
                title: "查询结果",
                description: "批量查询已完成！",
                color: "success" // 使用 Success 类型
            });
        } else {
            addToast({
                title: "查询结果",
                description: "批量查询已停止或部分完成。",
                color: "default" // 使用 Default 类型
            });
        }
    };

    /** 处理停止查询的逻辑 */
    const handleStopQuery = () => {
        setIsStopped(true); // 设置停止标志
        // 立即更新 UI 状态，给用户反馈
        setLoading(false);
        setProgress(0); // 清空进度条
        addToast({
            title: "操作提示",
            description: "查询已请求停止，正在中止中...",
            color: "default" // 使用 Default 类型
        });
    };

    /** 渲染预览域名列表中的每一行 */
    const renderDomainRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
        return (
          <div style={style} className="text-sm text-gray-600 hover:bg-gray-50 p-1 rounded">
              {previewDomains[index]}
          </div>
        );
    }, [previewDomains]);

    const listHeight = Math.min(previewDomains.length * rowHeight, maxListHeight);

    /** 过滤可注册的域名 */
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

    /** 过滤已被注册的域名或查询失败的域名 */
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
          {/* 域名位置配置区域 */}
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

              {/* 添加/移除位置按钮 */}
              {batchConfig.positions.length < 6 && ( // 限制最多6个位置
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

              {batchConfig.positions.length > 1 && ( // 至少保留一个位置
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

          {/* 数字域名生成条件筛选 */}
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

          {/* 线程数配置 */}
          <div className="flex items-center gap-2">
              <span>线程数:</span>
              <NumberInput
                value={batchConfig.threadCount}
                onChange={(value) => {
                    // 确保线程数在 1 到 10 之间
                    const numValue = Math.min(Math.max(1, Math.floor(value as number)), 10);
                    setBatchConfig({ ...batchConfig, threadCount: numValue });
                }}
                minValue={1}
                maxValue={10}
                className="w-20"
                disabled={loading}
              />
          </div>

          {/* 操作按钮：开始查询 / 停止 */}
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
                  disabled={!loading} // 只有在加载中才可点击停止
                  className="w-24"
                >
                    停止
                </Button>
              )}
          </div>

          {/* 预览域名列表显示 */}
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

          {/* 查询进度条显示 */}
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

          {/* 结果过滤输入框 */}
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

          {/* 查询结果显示：可注册/已被注册域名列表 */}
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