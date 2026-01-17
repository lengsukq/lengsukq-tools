"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input, Button, Select, SelectItem, NumberInput, addToast } from "@heroui/react";
import { FixedSizeList as _FixedSizeList } from "react-window";
import { WhoisResponse } from "../domain-checker/types";
import { applyDomainFilter } from "@/utils/domain-patterns";
import { isValidDomainPart } from "@/utils/domain-validator";
import { BatchConfig, PositionConfig } from "./types";
import { DOMAIN_FILTER_OPTIONS, LIST_CONFIG } from "./constants";

const FixedSizeList = _FixedSizeList as any;

interface BatchQueryProps {
  suffix: string;
  onQuery: (domains: string[]) => Promise<WhoisResponse[]>;
}

export function BatchQuery({ suffix, onQuery }: BatchQueryProps) {
  const [batchConfig, setBatchConfig] = useState<BatchConfig>({
    positions: [{ type: "number" }],
    threadCount: LIST_CONFIG.DEFAULT_THREAD_COUNT,
    domainFilter: null,
  });
  const [previewDomains, setPreviewDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<WhoisResponse[]>([]);
  const [isStopped, setIsStopped] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState("");

  /**
   * 判断所有域名生成位置是否都为数字类型或自定义输入且内容为纯数字。
   */
  const isAllNumbers = useCallback(
    () =>
      batchConfig.positions.every(
        (pos) =>
          pos.type === "number" ||
          (pos.type === "input" && /^\d+$/.test(pos.value || "")),
      ),
    [batchConfig.positions],
  );

  /**
   * 根据当前配置生成预览域名列表。
   */
  const generateDomains = useCallback(() => {
    const domains: string[] = [];
    const { positions, domainFilter } = batchConfig;

    const generateCombinations = (current: string, index: number) => {
      if (index === positions.length) {
        // 如果是纯数字域名，且选择了过滤器，则应用过滤器
        if (isAllNumbers() && domainFilter && domainFilter !== "none") {
          if (!applyDomainFilter(current, domainFilter)) return;
        }

        // 对生成的域名标签部分进行校验
        if (!isValidDomainPart(current)) {
          return;
        }
        domains.push(`${current}.${suffix}`);
        return;
      }

      const pos = positions[index];

      if (pos.type === "number") {
        for (let i = 0; i <= 9; i++) {
          generateCombinations(current + i, index + 1);
        }
      } else if (pos.type === "letter") {
        for (let i = 0; i < 26; i++) {
          const letter = String.fromCharCode(97 + i);
          generateCombinations(current + letter, index + 1);
        }
      } else if (pos.type === "input" && pos.value) {
        generateCombinations(current + pos.value, index + 1);
      }
    };

    generateCombinations("", 0);
    return domains;
  }, [batchConfig, suffix, isAllNumbers]);

  const updatePreviewDomains = useCallback(() => {
    setPreviewDomains(generateDomains());
  }, [generateDomains]);

  useEffect(() => {
    updatePreviewDomains();
  }, [updatePreviewDomains]);

  /**
   * 验证域名配置
   */
  const validateDomainConfig = (): string | null => {
    if (!suffix) {
      return "请填写域名后缀。";
    }

    if (!isValidDomainPart(suffix)) {
      return `域名后缀 '${suffix}' 不符合域名规范。`;
    }

    for (const fullDomain of previewDomains) {
      const domainLabels = fullDomain.split(".");

      if (domainLabels.length < 2) {
        return `生成的域名 '${fullDomain}' 格式不完整，至少需要一个主域名和一个后缀。`;
      }

      for (const label of domainLabels) {
        if (label === "") {
          return `域名 '${fullDomain}' 包含空的域名部分 (例如 '..')，不符合域名规范。`;
        }
        if (!isValidDomainPart(label)) {
          return `域名 '${fullDomain}' 中的部分 '${label}' 不符合域名规范，请检查组合规则。`;
        }
      }
    }

    return null;
  };

  /**
   * 处理批量查询的主逻辑
   */
  const handleBatchQuery = async () => {
    const validationError = validateDomainConfig();
    if (validationError) {
      addToast({
        title: validationError.includes("后缀") ? "查询前提示" : "校验错误",
        description: validationError,
        color: validationError.includes("后缀") ? "warning" : "danger",
      });
      return;
    }

    setLoading(true);
    setBatchResults([]);
    setProgress(0);
    setIsStopped(false);

    const domains = previewDomains;
    const totalDomains = domains.length;
    const threadCount = Math.min(
      Math.max(LIST_CONFIG.MIN_THREAD_COUNT, Math.floor(batchConfig.threadCount)),
      LIST_CONFIG.MAX_THREAD_COUNT,
    );
    let completedCount = 0;

    const queryInChunks = async (startIndex: number, endIndex: number) => {
      const chunkDomains = domains.slice(startIndex, endIndex);

      for (let i = 0; i < chunkDomains.length; i++) {
        if (isStopped) {
          console.log(`Thread stopped proactively before querying: ${chunkDomains[i]}`);
          return;
        }

        const domain = chunkDomains[i];

        try {
          const result = await onQuery([domain]);

          if (isStopped) {
            console.log(`Query for ${domain} completed but stop signal received.`);
            return;
          }

          const finalResult = Array.isArray(result) ? result : [result];

          if (!isStopped) {
            setBatchResults((prevResults) => [...prevResults, ...finalResult]);
          }
        } catch (error) {
          console.error(`查询 ${domain} 出错`, error);
        }

        completedCount++;
        setProgress((completedCount / totalDomains) * 100);
      }
    };

    const threadPromises: Promise<void>[] = [];
    let startIndex = 0;
    const baseDomainsPerThread = Math.floor(totalDomains / threadCount);
    let remainder = totalDomains % threadCount;

    for (let i = 0; i < threadCount; i++) {
      let currentThreadDomains = baseDomainsPerThread;

      if (remainder > 0) {
        currentThreadDomains++;
        remainder--;
      }
      const endIndex = startIndex + currentThreadDomains;

      if (startIndex < totalDomains) {
        threadPromises.push(queryInChunks(startIndex, endIndex));
        startIndex = endIndex;
      }
    }

    await Promise.allSettled(threadPromises);
    setLoading(false);

    if (!isStopped && completedCount === totalDomains) {
      addToast({
        title: "查询结果",
        description: "批量查询已全部完成！",
        color: "success",
      });
    } else if (isStopped) {
      addToast({
        title: "操作提示",
        description: "批量查询已中止。",
        color: "default",
      });
    } else {
      addToast({
        title: "查询结果",
        description: "批量查询已部分完成。",
        color: "default",
      });
    }
  };

  const handleStopQuery = () => {
    setIsStopped(true);
    addToast({
      title: "操作提示",
      description: "查询已请求停止，正在中止中...",
      color: "default",
    });
  };

  const handleCopyPreviewDomains = async () => {
    if (previewDomains.length === 0) {
      addToast({
        title: "复制失败",
        description: "预览域名列表为空，无法复制。",
        color: "warning",
      });
      return;
    }

    try {
      const domainsText = previewDomains.join("\n");
      await navigator.clipboard.writeText(domainsText);
      addToast({
        title: "复制成功",
        description: `已复制 ${previewDomains.length} 个域名到剪贴板。`,
        color: "success",
      });
    } catch (err) {
      console.error("Failed to copy domains: ", err);
      addToast({
        title: "复制失败",
        description: "无法访问剪贴板，请检查浏览器权限。",
        color: "danger",
      });
    }
  };

  const renderDomainRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      return (
        <div
          className="text-sm text-gray-600 hover:bg-gray-50 p-1 rounded"
          style={style}
        >
          {previewDomains[index]}
        </div>
      );
    },
    [previewDomains],
  );

  const listHeight = Math.min(
    previewDomains.length * LIST_CONFIG.ROW_HEIGHT,
    LIST_CONFIG.MAX_HEIGHT,
  );

  const filteredAvailableDomains = useMemo(() => {
    if (!filterKeyword) {
      return batchResults.filter(
        (result) => !result.isRegistered && !result.error,
      );
    }
    const lowerCaseKeyword = filterKeyword.toLowerCase();

    return batchResults.filter(
      (result) =>
        !result.isRegistered &&
        !result.error &&
        result.domain.toLowerCase().includes(lowerCaseKeyword),
    );
  }, [batchResults, filterKeyword]);

  const filteredRegisteredDomains = useMemo(() => {
    if (!filterKeyword) {
      return batchResults.filter(
        (result) => result.isRegistered || result.error,
      );
    }
    const lowerCaseKeyword = filterKeyword.toLowerCase();

    return batchResults.filter(
      (result) =>
        (result.isRegistered || result.error) &&
        result.domain.toLowerCase().includes(lowerCaseKeyword),
    );
  }, [batchResults, filterKeyword]);

  const updatePositionType = (index: number, type: string) => {
    const newPositions = [...batchConfig.positions];
    newPositions[index] = {
      ...batchConfig.positions[index],
      type: type as PositionConfig["type"],
      value: "",
    };
    setBatchConfig({ ...batchConfig, positions: newPositions });
  };

  const updatePositionValue = (index: number, value: string) => {
    const newPositions = [...batchConfig.positions];
    newPositions[index] = { ...batchConfig.positions[index], value };
    setBatchConfig({ ...batchConfig, positions: newPositions });
  };

  return (
    <div className="space-y-4">
      {/* 域名位置配置区域 */}
      <div className="flex flex-wrap gap-2">
        {batchConfig.positions.map((pos, index) => (
          <div key={index} className="flex gap-2 items-center">
            <Select
              className="w-24"
              disabled={loading}
              selectedKeys={pos.type ? [pos.type] : []}
              onChange={(e) => updatePositionType(index, e.target.value)}
            >
              <SelectItem key={"number"}>数字</SelectItem>
              <SelectItem key={"letter"}>字母</SelectItem>
              <SelectItem key={"input"}>自定义</SelectItem>
            </Select>
            {pos.type === "input" && (
              <Input
                className="w-24"
                disabled={loading}
                placeholder="输入内容"
                value={pos.value || ""}
                onChange={(e) => updatePositionValue(index, e.target.value)}
              />
            )}
          </div>
        ))}

        {batchConfig.positions.length < LIST_CONFIG.MAX_POSITIONS && (
          <Button
            className="px-2 py-1"
            disabled={loading}
            onClick={() =>
              setBatchConfig({
                ...batchConfig,
                positions: [...batchConfig.positions, { type: "number" }],
              })
            }
          >
            +
          </Button>
        )}

        {batchConfig.positions.length > LIST_CONFIG.MIN_POSITIONS && (
          <Button
            className="px-2 py-1"
            disabled={loading}
            onClick={() =>
              setBatchConfig({
                ...batchConfig,
                positions: batchConfig.positions.slice(0, -1),
              })
            }
          >
            -
          </Button>
        )}
      </div>

      {/* 数字域名生成条件筛选 */}
      {isAllNumbers() && (
        <div className="flex items-center gap-2">
          <Select
            className="max-w-xs"
            disabled={loading}
            label="生成条件"
            placeholder="请选择生成条件"
            selectedKeys={
              batchConfig.domainFilter ? [batchConfig.domainFilter] : []
            }
            onChange={(e) => {
              const value = e.target.value;
              setBatchConfig({
                ...batchConfig,
                domainFilter: value === "none" ? null : value,
              });
            }}
          >
            {DOMAIN_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>
        </div>
      )}

      {/* 线程数配置 */}
      <div className="flex items-center gap-2">
        <span>线程数:</span>
        <NumberInput
          className="w-20"
          disabled={loading}
          maxValue={LIST_CONFIG.MAX_THREAD_COUNT}
          minValue={LIST_CONFIG.MIN_THREAD_COUNT}
          step={5}
          value={batchConfig.threadCount}
          onChange={(value) => {
            const numValue = Math.min(
              Math.max(LIST_CONFIG.MIN_THREAD_COUNT, Math.floor(value as number)),
              LIST_CONFIG.MAX_THREAD_COUNT,
            );
            setBatchConfig({ ...batchConfig, threadCount: numValue });
          }}
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          className="flex-grow"
          color="primary"
          disabled={!suffix || loading}
          isLoading={loading}
          onClick={handleBatchQuery}
        >
          开始批量查询
        </Button>
        {loading && (
          <Button
            className="w-24"
            color="secondary"
            disabled={!loading}
            onClick={handleStopQuery}
          >
            停止
          </Button>
        )}
      </div>

      {/* 预览域名列表显示 */}
      {previewDomains.length > 0 && (
        <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="font-medium text-gray-700">
              将要查询的域名列表：({previewDomains.length} 个)
            </div>
            <Button
              className="px-2 py-1 text-sm"
              disabled={loading || previewDomains.length === 0}
              onClick={handleCopyPreviewDomains}
            >
              复制
            </Button>
          </div>
          <div className="bg-gray-800 p-3 rounded">
            <FixedSizeList
              height={listHeight}
              itemCount={previewDomains.length || 0}
              itemSize={LIST_CONFIG.ROW_HEIGHT}
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
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 结果过滤输入框 */}
      {(batchResults.length > 0 || filterKeyword) && (
        <div className="flex items-center gap-2">
          <Input
            className="flex-grow"
            disabled={loading}
            placeholder="在结果中模糊查询域名"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
          />
        </div>
      )}

      {/* 查询结果显示 */}
      {(filteredAvailableDomains.length > 0 ||
        filteredRegisteredDomains.length > 0) && (
        <div className="space-y-4">
          {filteredAvailableDomains.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                可以注册的域名 ({filteredAvailableDomains.length} 个)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAvailableDomains.map((result, index) => (
                  <div
                    key={`available-${index}`}
                    className="p-4 bg-green-800 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.domain}</span>
                      <span className="px-2 py-1 text-sm rounded bg-green-200 text-green-800">
                        可以注册
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredRegisteredDomains.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                已被注册的域名 ({filteredRegisteredDomains.length} 个)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRegisteredDomains.map((result, index) => (
                  <div
                    key={`registered-${index}`}
                    className="p-4 bg-red-800 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.domain}</span>
                      <span className="px-2 py-1 text-sm rounded text-red-200">
                        {result.error
                          ? `查询失败: ${result.error}`
                          : "已被注册"}
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
