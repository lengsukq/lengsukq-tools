import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { FixedSizeList as _FixedSizeList } from "react-window";
import { NumberInput } from "@heroui/number-input";
// 导入 addToast 函数，现在明确它接受一个 color 属性
import { addToast } from "@heroui/toast";

import { WhoisResponse } from "./domain-checker";

const FixedSizeList = _FixedSizeList as any;

interface PositionConfig {
  type: "number" | "letter" | "input";
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
    threadCount: number; // 查询线程数
    domainFilter: string | null; // 域名过滤条件，改为单选，存储 key 或 null
  }>({
    positions: [{ type: "number" }],
    threadCount: 10, // 默认线程数改为 10
    domainFilter: null, // 初始值为空
  });
  const [previewDomains, setPreviewDomains] = useState<string[]>([]); // 预览生成的域名列表
  const [loading, setLoading] = useState(false); // 查询加载状态
  const [progress, setProgress] = useState(0); // 查询进度
  const [batchResults, setBatchResults] = useState<WhoisResponse[]>([]); // 批量查询结果

  const [isStopped, setIsStopped] = useState(false); // 查询停止标志，用于控制线程中断

  const [filterKeyword, setFilterKeyword] = useState(""); // 结果过滤关键词

  const rowHeight = 24;
  const maxListHeight = 160;

  // 所有的域名过滤选项
  const domainFilterOptions = [
    { key: "none", label: "无" }, // 表示不应用任何过滤器
    { key: "AAA", label: "AAA" }, // 新增 AAA
    { key: "ABBBA", label: "ABBBA" }, // 新增 ABBBA
    { key: "ABCABC", label: "ABCABC" }, // 新增 ABCABC
    { key: "ABBBBA", label: "ABBBBA" }, // 新增 ABBBBA
    { key: "AA", label: "AA" },
    { key: "ABCDEE", label: "ABCDEE" },
    { key: "useConsecutive", label: "顺子" },
    { key: "useAABB", label: "AABB" },
    { key: "useAABBCC", label: "AABBCC" },
    { key: "useABA", label: "ABA" },
    { key: "useABCBA", label: "ABCBA" },
    { key: "useABCCBA", label: "ABCCBA" },
    { key: "useABCCAB", label: "ABCCAB" },
  ];

  /**
   * 判断所有域名生成位置是否都为数字类型或自定义输入且内容为纯数字。
   * 用于决定是否显示数字相关的筛选条件。
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

  // 以下是各种域名数字组合的辅助函数（AAA、ABBBA、ABCABC、ABBBBA、顺子、AA、AABB、AABBCC、ABA、ABCBA、ABCCBA、ABCCAB、ABCDEE）

  // 检查是否包含 AAA 模式
  const hasAAA = (str: string): boolean => {
    if (str.length < 3) return false;
    for (let i = 0; i <= str.length - 3; i++) {
      if (
        str[i] === str[i + 1] &&
        str[i + 1] === str[i + 2] &&
        /^\d$/.test(str[i])
      ) {
        return true;
      }
    }
    return false;
  };

  // 检查是否包含 ABBBA 模式
  const hasABBBA = (str: string): boolean => {
    if (str.length < 5) return false; // ABBBA 至少需要5个字符
    for (let i = 0; i <= str.length - 5; i++) {
      const char0 = str[i]; // A
      const char1 = str[i + 1]; // B
      const char2 = str[i + 2]; // B
      const char3 = str[i + 3]; // B
      const char4 = str[i + 4]; // A

      // 确保所有字符都是数字，并且 A==A, B==B==B
      if (
        /^\d$/.test(char0) &&
        /^\d$/.test(char1) &&
        /^\d$/.test(char2) &&
        /^\d$/.test(char3) &&
        /^\d$/.test(char4) &&
        char0 === char4 && // 第一个和第五个字符相同
        char1 === char2 && // 第二个和第三个字符相同
        char2 === char3 // 第三个和第四个字符相同
      ) {
        return true;
      }
    }
    return false;
  };

  // 检查是否包含 ABCABC 模式
  const hasABCABC = (str: string): boolean => {
    if (str.length < 6) return false; // ABCABC 至少需要6个字符
    for (let i = 0; i <= str.length - 6; i++) {
      const char0 = str[i]; // A
      const char1 = str[i + 1]; // B
      const char2 = str[i + 2]; // C
      const char3 = str[i + 3]; // A
      const char4 = str[i + 4]; // B
      const char5 = str[i + 5]; // C

      // 确保所有字符都是数字，并且 A==A, B==B, C==C
      if (
        /^\d$/.test(char0) &&
        /^\d$/.test(char1) &&
        /^\d$/.test(char2) &&
        /^\d$/.test(char3) &&
        /^\d$/.test(char4) &&
        /^\d$/.test(char5) &&
        char0 === char3 && // 第一个和第四个字符相同
        char1 === char4 && // 第二个和第五个字符相同
        char2 === char5 // 第三个和第六个字符相同
      ) {
        return true;
      }
    }
    return false;
  };

  // 检查是否包含 ABBBBA 模式
  const hasABBBBA = (str: string): boolean => {
    if (str.length < 6) return false; // ABBBBA 至少需要6个字符
    for (let i = 0; i <= str.length - 6; i++) {
      const char0 = str[i]; // A
      const char1 = str[i + 1]; // B
      const char2 = str[i + 2]; // B
      const char3 = str[i + 3]; // B
      const char4 = str[i + 4]; // B
      const char5 = str[i + 5]; // A

      // 确保所有字符都是数字，并且 A==A, B==B==B==B
      if (
        /^\d$/.test(char0) &&
        /^\d$/.test(char1) &&
        /^\d$/.test(char2) &&
        /^\d$/.test(char3) &&
        /^\d$/.test(char4) &&
        /^\d$/.test(char5) &&
        char0 === char5 && // 第一个和第六个字符相同
        char1 === char2 && // 第二个和第三个字符相同
        char2 === char3 && // 第三和第四个字符相同
        char3 === char4 // 第四和第五个字符相同
      ) {
        return true;
      }
    }
    return false;
  };

  const hasConsecutiveNumbers = (str: string): boolean => {
    if (str.length < 3) return false;
    for (let i = 0; i <= str.length - 3; i++) {
      const num1 = parseInt(str[i]);
      const num2 = parseInt(str[i + 1]);
      const num3 = parseInt(str[i + 2]);

      // 检查是否是连续数字，考虑0-9的循环（例如901）
      if (
        !isNaN(num1) &&
        !isNaN(num2) &&
        !isNaN(num3) &&
        num2 === (num1 + 1) % 10 &&
        num3 === (num2 + 1) % 10
      ) {
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
  };

  const hasAABBCC = (str: string): boolean => {
    if (str.length < 6) return false;
    for (let i = 0; i <= str.length - 6; i++) {
      const sub = str.substring(i, i + 6);

      if (sub[0] === sub[1] && sub[2] === sub[3] && sub[4] === sub[5])
        return true;
    }

    return false;
  };

  const hasABA = (str: string): boolean => {
    if (str.length < 3) return false;
    for (let i = 0; i <= str.length - 3; i++) {
      if (
        str[i] === str[i + 2] &&
        /^\d$/.test(str[i]) &&
        /^\d$/.test(str[i + 1])
      ) {
        return true;
      }
    }
    return false;
  };

  const hasABCBA = (str: string): boolean => {
    if (str.length < 5) return false;
    for (let i = 0; i <= str.length - 5; i++) {
      const char0 = str[i];
      const char1 = str[i + 1];
      const char2 = str[i + 2];
      const char3 = str[i + 3];
      const char4 = str[i + 4];

      if (
        /^\d$/.test(char0) &&
        /^\d$/.test(char1) &&
        /^\d$/.test(char2) &&
        /^\d$/.test(char3) &&
        /^\d$/.test(char4) &&
        char0 === char4 &&
        char1 === char3
      ) {
        return true;
      }
    }
    return false;
  };

  const hasABCCBA = (str: string): boolean => {
    if (str.length < 6) return false;
    for (let i = 0; i <= str.length - 6; i++) {
      const char0 = str[i];
      const char1 = str[i + 1];
      const char2 = str[i + 2];
      const char3 = str[i + 3];
      const char4 = str[i + 4];
      const char5 = str[i + 5];

      if (
        /^\d$/.test(char0) &&
        /^\d$/.test(char1) &&
        /^\d$/.test(char2) &&
        /^\d$/.test(char3) &&
        /^\d$/.test(char4) &&
        /^\d$/.test(char5) &&
        char0 === char5 &&
        char1 === char4 &&
        char2 === char3
      ) {
        return true;
      }
    }
    return false;
  };

  const hasABCCAB = (str: string): boolean => {
    if (str.length < 6) return false;
    for (let i = 0; i <= str.length - 6; i++) {
      const char0 = str[i];
      const char1 = str[i + 1];
      const char2 = str[i + 2];
      const char3 = str[i + 3];
      const char4 = str[i + 4];
      const char5 = str[i + 5];

      if (
        /^\d$/.test(char0) &&
        /^\d$/.test(char1) &&
        /^\d$/.test(char2) &&
        /^\d$/.test(char3) &&
        /^\d$/.test(char4) &&
        /^\d$/.test(char5) &&
        char0 === char4 &&
        char1 === char5 &&
        char2 === char3
      ) {
        return true;
      }
    }
    return false;
  };

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
        /^\d$/.test(char0) &&
        /^\d$/.test(char1) &&
        /^\d$/.test(char2) &&
        /^\d$/.test(char3) &&
        /^\d$/.test(char4) &&
        /^\d$/.test(char5) &&
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
  };

  /**
   * 根据当前配置生成预览域名列表。
   * 使用递归方法生成所有组合，并应用数字过滤器。
   */
  const generateDomains = useCallback(() => {
    const domains: string[] = [];
    const { positions, domainFilter } = batchConfig; // domainFilter 现在是单选值

    const generateCombinations = (current: string, index: number) => {
      // 所有位置都已处理，生成一个完整域名
      if (index === positions.length) {
        // 如果是纯数字域名，且选择了过滤器（非'none'），则应用数字相关的过滤器
        if (isAllNumbers() && domainFilter && domainFilter !== "none") {
          switch (domainFilter) {
            case "useConsecutive":
              if (!hasConsecutiveNumbers(current)) return;
              break;
            case "AA":
              if (!hasAA(current)) return;
              break;
            case "AAA": // 过滤器应用
              if (!hasAAA(current)) return;
              break;
            case "useAABB":
              if (!hasAABB(current)) return;
              break;
            case "useAABBCC":
              if (!hasAABBCC(current)) return;
              break;
            case "useABA":
              if (!hasABA(current)) return;
              break;
            case "useABCBA":
              if (!hasABCBA(current)) return;
              break;
            case "useABCCBA":
              if (!hasABCCBA(current)) return;
              break;
            case "useABCCAB":
              if (!hasABCCAB(current)) return;
              break;
            case "ABBBA": // 过滤器应用
              if (!hasABBBA(current)) return;
              break;
            case "ABCABC": // 过滤器应用
              if (!hasABCABC(current)) return;
              break;
            case "ABBBBA": // 过滤器应用
              if (!hasABBBBA(current)) return;
              break;
            case "ABCDEE":
              if (!hasABCDEE(current)) return;
              break;
            default:
              // 如果 domainFilter 是一个未知的键，不进行过滤
              break;
          }
        }
        // 对生成的域名标签部分进行校验
        if (!isValidDomainPart(current)) {
          // 如果生成的主域名部分不合法，则不添加到列表中
          return;
        }
        domains.push(`${current}.${suffix}`);

        return;
      }

      // 处理当前位置
      const pos = positions[index];

      if (pos.type === "number") {
        for (let i = 0; i <= 9; i++) {
          generateCombinations(current + i, index + 1);
        }
      } else if (pos.type === "letter") {
        for (let i = 0; i < 26; i++) {
          const letter = String.fromCharCode(97 + i); // 小写字母

          generateCombinations(current + letter, index + 1);
        }
      } else if (pos.type === "input" && pos.value) {
        generateCombinations(current + pos.value, index + 1);
      }
    };

    generateCombinations("", 0);

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
        color: "warning", // 使用 Warning 类型
      });

      return;
    }

    // 2. 校验域名后缀本身是否合法（作为一个域名标签）
    if (!isValidDomainPart(suffix)) {
      addToast({
        title: "校验错误",
        description: `域名后缀 '${suffix}' 不符合域名规范。`,
        color: "danger", // 使用 Danger 类型
      });

      return;
    }

    // 3. 校验所有生成的完整域名是否合法
    for (const fullDomain of previewDomains) {
      const domainLabels = fullDomain.split(".");

      // 至少需要一个主域名部分和一个后缀，所以至少两个标签
      if (domainLabels.length < 2) {
        addToast({
          title: "校验错误",
          description: `生成的域名 '${fullDomain}' 格式不完整，至少需要一个主域名和一个后缀。`,
          color: "danger", // 使用 Danger 类型
        });

        return;
      }

      // 遍历所有标签，确保每个标签都合法且非空
      for (const label of domainLabels) {
        // 检查是否存在空标签（例如 `..` 会导致 split 结果中出现空字符串）
        if (label === "") {
          addToast({
            title: "校验错误",
            description: `域名 '${fullDomain}' 包含空的域名部分 (例如 '..')，不符合域名规范。`,
            color: "danger", // 使用 Danger 类型
          });

          return;
        }
        // 校验每个非空标签是否符合域名标签的规范
        if (!isValidDomainPart(label)) {
          addToast({
            title: "校验错误",
            description: `域名 '${fullDomain}' 中的部分 '${label}' 不符合域名规范，请检查组合规则。`,
            color: "danger", // 使用 Danger 类型
          });

          return;
        }
      }
    }

    // 开始查询，设置加载状态和进度
    setLoading(true);
    setBatchResults([]);
    setProgress(0);
    setIsStopped(false); // 确保在开始查询时重置停止标志

    const domains = previewDomains;
    const totalDomains = domains.length;
    // 线程数限制在 1 到 30，并且是整数
    const threadCount = Math.min(
      Math.max(1, Math.floor(batchConfig.threadCount)),
      30,
    );
    let completedCount = 0;

    // 使用 Promise.race 实现停止逻辑：当 isStopped 变为 true 时，所有进行中的查询线程都应该尽快停止
    const queryInChunks = async (startIndex: number, endIndex: number) => {
      const chunkDomains = domains.slice(startIndex, endIndex);

      for (let i = 0; i < chunkDomains.length; i++) {
        // 在每次查询前检查停止标志
        if (isStopped) {
          console.log(
            `Thread stopped proactively before querying: ${chunkDomains[i]}`,
          );
          return; // 退出当前线程
        }
        const domain = chunkDomains[i];

        try {
          // 每个查询都可能耗时，所以需要在查询完成后再次检查 isStopped
          const result = await onQuery([domain]); // 执行查询
          // 再次检查，防止长时间等待的查询完成时isStopped已经为true
          if (isStopped) {
            console.log(
              `Query for ${domain} completed but stop signal received.`,
            );
            return; // 立即返回，不再处理后续域名
          }
          const finalResult = Array.isArray(result) ? result : [result];

          // 只有在没有停止的情况下才更新结果，避免停止后仍有结果写入
          if (!isStopped) {
            setBatchResults((prevResults) => [...prevResults, ...finalResult]);
          }
        } catch (error) {
          console.error(`查询 ${domain} 出错`, error);
          if (!isStopped) {
            // 只有在没有停止的情况下才记录错误结果
            // setBatchResults(prevResults => [...prevResults, { domain, error: String(error), isRegistered: false }]);
          }
        }
        completedCount++;
        // 确保进度条更新是基于总域名数
        setProgress((completedCount / totalDomains) * 100); // 更新进度
      }
    };

    // 创建并等待所有线程完成
    const threadPromises: Promise<void>[] = []; // 明确 Promise 数组的类型
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
        // 避免创建空线程
        threadPromises.push(queryInChunks(startIndex, endIndex));
        startIndex = endIndex;
      }
    }

    // 等待所有查询线程完成，无论成功或失败（包括因 isStopped 中断的）
    await Promise.allSettled(threadPromises);

    setLoading(false); // 查询结束后解除加载状态
    // isStopped 标志在 handleStopQuery 中设置，在 handleBatchQuery 结束时不用特意重置，
    // 因为下一次点击开始查询时，它会被重置为 false。

    // 根据最终进度判断查询结果
    // 这里的 completedCount 是所有线程累加的，即使中断也会增加。
    // 所以判断是否 "全部完成" 更精确的方式是检查 `completedCount` 是否等于 `totalDomains` 并且 `isStopped` 为 `false`
    if (!isStopped && completedCount === totalDomains) {
      addToast({
        title: "查询结果",
        description: "批量查询已全部完成！",
        color: "success", // 使用 Success 类型
      });
    } else if (isStopped) {
      // 如果是用户主动停止
      addToast({
        title: "操作提示",
        description: "批量查询已中止。",
        color: "default", // 使用 Default 类型
      });
    } else {
      // 可能是部分完成（例如，因为某些错误提前中断，但未被isStopped捕获导致并非全部完成）
      addToast({
        title: "查询结果",
        description: "批量查询已部分完成。",
        color: "default", // 使用 Default 类型
      });
    }
  };

  /** 处理停止查询的逻辑 */
  const handleStopQuery = () => {
    setIsStopped(true); // 设置停止标志，这将通知所有正在运行的查询线程停止
    addToast({
      title: "操作提示",
      description: "查询已请求停止，正在中止中...",
      color: "default", // 使用 Default 类型
    });
    // 不在此处直接设置 setLoading(false) 或 setProgress(0)，
    // 因为停止是一个异步过程，这些UI状态的更新应在 handleBatchQuery 的最终完成处。
  };

  /** 处理复制预览域名列表的逻辑 */
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
      const domainsText = previewDomains.join("\n"); // 使用换行符连接所有域名
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

  /** 渲染预览域名列表中的每一行 */
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

  const listHeight = Math.min(previewDomains.length * rowHeight, maxListHeight);

  /** 过滤可注册的域名 */
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

  /** 过滤已被注册的域名或查询失败的域名 */
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

  return (
    <div className="space-y-4">
      {/* 域名位置配置区域 */}
      <div className="flex flex-wrap gap-2">
        {batchConfig.positions.map((pos, index) => (
          <div key={index} className="flex gap-2 items-center">
            <Select
              className="w-24"
              disabled={loading} // 查询时禁用
              selectedKeys={pos.type ? [pos.type] : []}
              onChange={(e) => {
                const value = e.target.value;
                const newPositions = [...batchConfig.positions];

                newPositions[index] = {
                  ...pos,
                  type: value as "number" | "letter" | "input",
                  value: "",
                };
                setBatchConfig({ ...batchConfig, positions: newPositions });
              }}
            >
              <SelectItem key={"number"}>数字</SelectItem>
              <SelectItem key={"letter"}>字母</SelectItem>
              <SelectItem key={"input"}>自定义</SelectItem>
            </Select>
            {pos.type === "input" && (
              <Input
                className="w-24"
                disabled={loading} // 查询时禁用
                placeholder="输入内容"
                value={pos.value || ""}
                onChange={(e) => {
                  const newPositions = [...batchConfig.positions];

                  newPositions[index] = { ...pos, value: e.target.value };
                  setBatchConfig({ ...batchConfig, positions: newPositions });
                }}
              />
            )}
          </div>
        ))}

        {/* 添加/移除位置按钮 */}
        {batchConfig.positions.length < 6 && ( // 限制最多6个位置
          <Button
            className="px-2 py-1"
            disabled={loading} // 查询时禁用
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

        {batchConfig.positions.length > 1 && ( // 至少保留一个位置
          <Button
            className="px-2 py-1"
            disabled={loading} // 查询时禁用
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

      {/* 数字域名生成条件筛选（改为单选） */}
      {isAllNumbers() && (
        <div className="flex items-center gap-2">
          <Select
            className="max-w-xs"
            disabled={loading} // 查询时禁用
            label="生成条件"
            placeholder="请选择生成条件"
            selectedKeys={
              batchConfig.domainFilter ? [batchConfig.domainFilter] : []
            }
            onChange={(e) => {
              const value = e.target.value;
              setBatchConfig({
                ...batchConfig,
                domainFilter: value === "none" ? null : (value as string),
              });
            }}
          >
            {domainFilterOptions.map((option) => (
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
          disabled={loading} // 查询时禁用
          maxValue={30}
          minValue={5}
          step={5} // 步距为 5
          value={batchConfig.threadCount}
          onChange={(value) => {
            const numValue = Math.min(
              Math.max(1, Math.floor(value as number)),
              30,
            );

            setBatchConfig({ ...batchConfig, threadCount: numValue });
          }}
        />
      </div>

      {/* 操作按钮：开始查询 / 停止 */}
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
            disabled={!loading} // 只有在加载中才可点击停止
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
            {" "}
            {/* 使用flex布局将标题和按钮放在一行 */}
            <div className="font-medium text-gray-700">
              将要查询的域名列表：({previewDomains.length} 个)
            </div>
            <Button
              size={"sm"}
              className="px-2 py-1 text-sm"
              disabled={loading || previewDomains.length === 0} // 查询时禁用，且列表为空时禁用
              onClick={handleCopyPreviewDomains}
            >
              复制
            </Button>
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
            placeholder="在结果中模糊查询域名"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            disabled={loading} // 查询时禁用
          />
        </div>
      )}

      {/* 查询结果显示：可注册/已被注册域名列表 */}
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
