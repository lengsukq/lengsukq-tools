"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useReducer,
  useMemo,
} from "react";
import { Input, Card, CardHeader, CardBody, Button, Switch, Select, SelectItem, Slider } from "@heroui/react";

import { PRESET_DOWNLOADS } from "./constants";

// ============================================================================
// 1. 自定义 Hook: 封装所有下载核心逻辑
// ============================================================================

type DownloadHistoryItem = {
  url: string;
  timestamp: Date;
  size: number; // in MB
};

type DownloaderState = {
  isDownloading: boolean;
  totalDownloadedMB: number;
  history: DownloadHistoryItem[];
  currentProgress: {
    loadedMB: number;
    totalMB: number | null; // 可能无法获取总大小
    percent: number;
    speedMbps: number; // 下载速度
  };
  error: string | null;
};

type Action =
  | { type: "START_DOWNLOAD" }
  | { type: "STOP_DOWNLOAD" }
  | { type: "RESET" }
  | { type: "SET_ERROR"; payload: string }
  | {
      type: "UPDATE_PROGRESS";
      payload: Omit<DownloaderState["currentProgress"], "speedMbps">;
    }
  | { type: "UPDATE_SPEED"; payload: number }
  | { type: "COMPLETE_DOWNLOAD"; payload: { url: string; size: number } };

const initialState: DownloaderState = {
  isDownloading: false,
  totalDownloadedMB: 0,
  history: [],
  currentProgress: {
    loadedMB: 0,
    totalMB: null,
    percent: 0,
    speedMbps: 0,
  },
  error: null,
};

function downloaderReducer(
  state: DownloaderState,
  action: Action,
): DownloaderState {
  switch (action.type) {
    case "START_DOWNLOAD":
      return {
        ...state,
        isDownloading: true,
        error: null,
        currentProgress: initialState.currentProgress,
      };
    case "STOP_DOWNLOAD":
      return {
        ...state,
        isDownloading: false,
        currentProgress: initialState.currentProgress,
      };
    case "RESET":
      return initialState;
    case "SET_ERROR":
      return {
        ...state,
        isDownloading: false,
        error: action.payload,
      };
    case "UPDATE_PROGRESS":
      return {
        ...state,
        currentProgress: {
          ...state.currentProgress,
          ...action.payload,
        },
      };
    case "UPDATE_SPEED":
      return {
        ...state,
        currentProgress: {
          ...state.currentProgress,
          speedMbps: action.payload,
        },
      };
    case "COMPLETE_DOWNLOAD":
      const { url, size } = action.payload;

      return {
        ...state,
        isDownloading: false,
        totalDownloadedMB: state.totalDownloadedMB + size,
        history: [...state.history, { url, size, timestamp: new Date() }],
        currentProgress: {
          ...state.currentProgress,
          percent: 100,
          speedMbps: 0,
        },
      };
    default:
      return state;
  }
}

/**
 * @description 封装了流量消耗下载逻辑的自定义 Hook
 */
const useTrafficDownloader = () => {
  const [state, dispatch] = useReducer(downloaderReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const downloadStartTimeRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  const lastLoadedBytesRef = useRef<number>(0);

  const start = useCallback(
    async (url: string): Promise<{ completed: boolean }> => {
      if (state.isDownloading) return { completed: false };

      dispatch({ type: "START_DOWNLOAD" });
      abortControllerRef.current = new AbortController();
      downloadStartTimeRef.current = Date.now();
      lastUpdateTimeRef.current = Date.now();
      lastLoadedBytesRef.current = 0;

      try {
        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
          cache: "no-store", // 确保每次都从网络下载
        });

        if (!response.ok) {
          throw new Error(
            `请求失败: ${response.status} ${response.statusText}`,
          );
        }
        if (!response.body) {
          throw new Error("无法获取响应体");
        }

        const reader = response.body.getReader();
        const contentLength = response.headers.get("Content-Length");
        const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
        const totalMB = totalBytes ? totalBytes / (1024 * 1024) : null;

        let loadedBytes = 0;

        // 持续读取数据流
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break; // 下载完成
          }

          // 核心优化：只累加长度，不存储 value 数据块
          loadedBytes += value.length;
          const loadedMB = loadedBytes / (1024 * 1024);
          const percent = totalBytes ? (loadedBytes / totalBytes) * 100 : 0;

          // 更新进度
          dispatch({
            type: "UPDATE_PROGRESS",
            payload: { loadedMB, totalMB, percent },
          });

          // 计算瞬时速度
          const now = Date.now();
          const timeDiff = (now - lastUpdateTimeRef.current) / 1000; // seconds

          if (timeDiff > 0.5) {
            // 每 0.5 秒更新一次速度
            const bytesDiff = loadedBytes - lastLoadedBytesRef.current;
            const speedBps = bytesDiff / timeDiff; // Bytes per second
            const speedMbps = (speedBps * 8) / (1000 * 1000); // Megabits per second

            dispatch({ type: "UPDATE_SPEED", payload: speedMbps });
            lastUpdateTimeRef.current = now;
            lastLoadedBytesRef.current = loadedBytes;
          }
        }

        // 下载完成
        const finalDownloadedMB = loadedBytes / (1024 * 1024);

        dispatch({
          type: "COMPLETE_DOWNLOAD",
          payload: { url, size: finalDownloadedMB },
        });

        return { completed: true };
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("下载已取消");
          dispatch({ type: "STOP_DOWNLOAD" });
        } else {
          console.error("下载错误:", error);
          dispatch({ type: "SET_ERROR", payload: error.message });
        }

        return { completed: false };
      }
    },
    [state.isDownloading],
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: "STOP_DOWNLOAD" });
  }, []);

  const reset = useCallback(() => {
    stop();
    dispatch({ type: "RESET" });
  }, [stop]);

  // 组件卸载时自动清理
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { state, start, stop, reset };
};

// ============================================================================
// 2. 页面组件: 专注于 UI 和用户交互
// ============================================================================

export default function TrafficConsumerPage() {
  // UI 配置状态
  const [selectedDownload, setSelectedDownload] = useState("default");
  const [customUrl, setCustomUrl] = useState("");
  const [downloadLimit, setDownloadLimit] = useState(10); // GB
  const [isLooping, setIsLooping] = useState(true);

  // 使用自定义 Hook 管理下载逻辑
  const { state, start, stop, reset } = useTrafficDownloader();
  const { isDownloading, totalDownloadedMB, history, currentProgress, error } =
    state;

  // Ref 用于循环下载时防止竞态条件
  const isLoopingRef = useRef(isLooping);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  const downloadLimitMB = useMemo(() => downloadLimit * 1024, [downloadLimit]);

  // 开始下载的处理器
  const handleStartDownload = useCallback(async () => {
    const getUrl = () => {
      if (selectedDownload === "custom") return customUrl;

      return (
        PRESET_DOWNLOADS.find((item) => item.key === selectedDownload)?.url ??
        ""
      );
    };

    const url = getUrl();

    if (!url) {
      alert("请输入或选择有效的下载链接");

      return;
    }

    // 启动下载
    const { completed } = await start(url);

    // 如果下载完成、开启了循环且未达到流量上限，则自动开始下一次
    if (
      completed &&
      isLoopingRef.current &&
      totalDownloadedMB + currentProgress.loadedMB < downloadLimitMB
    ) {
      // 增加短暂延时，避免无缝连接导致 UI 卡顿
      setTimeout(handleStartDownload, 500);
    }
  }, [
    selectedDownload,
    customUrl,
    start,
    totalDownloadedMB,
    currentProgress.loadedMB,
    downloadLimitMB,
  ]);

  // 派生状态（使用 useMemo 优化）
  const remainingDataMB = useMemo(
    () => Math.max(0, downloadLimitMB - totalDownloadedMB),
    [downloadLimitMB, totalDownloadedMB],
  );

  const estimatedTime = useMemo(() => {
    if (
      !isDownloading ||
      currentProgress.speedMbps <= 0 ||
      !currentProgress.totalMB
    ) {
      return 0;
    }
    const remainingMB = currentProgress.totalMB - currentProgress.loadedMB;
    const remainingMbits = remainingMB * 8;

    return remainingMbits / currentProgress.speedMbps; // seconds
  }, [isDownloading, currentProgress]);

  // 格式化函数
  const formatTime = (seconds: number): string => {
    if (seconds === 0 || !isFinite(seconds)) return "-";
    if (seconds < 60) return `${Math.floor(seconds)} 秒`;
    if (seconds < 3600)
      return `${Math.floor(seconds / 60)} 分 ${Math.floor(seconds % 60)} 秒`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${hours} 小时 ${minutes} 分`;
  };

  const getCurrentDownloadName = (): string => {
    if (selectedDownload === "custom") return "自定义资源";

    return (
      PRESET_DOWNLOADS.find((item) => item.key === selectedDownload)?.label ??
      ""
    );
  };

  const isStartButtonDisabled = useMemo(
    () => totalDownloadedMB >= downloadLimitMB,
    [totalDownloadedMB, downloadLimitMB],
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Card className="max-w-2xl w-full p-4">
        <CardHeader className="flex justify-center">
          <h1 className="text-2xl font-bold">流量消耗器</h1>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* 下载配置 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">下载配置</h2>
            <Select
              label="选择下载资源"
              selectedKeys={[selectedDownload]}
              onSelectionChange={(keys) =>
                setSelectedDownload(Array.from(keys)[0] as string)
              }
            >
              {PRESET_DOWNLOADS.map((item) => (
                <SelectItem key={item.key}>{item.label}</SelectItem>
              ))}
            </Select>

            {selectedDownload === "custom" && (
              <Input
                label="下载链接"
                placeholder="https://example.com/file.zip"
                value={customUrl}
                onValueChange={setCustomUrl}
              />
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">
                消耗上限: {downloadLimit} GB
              </label>
              <Slider
                className="max-w-md"
                label="流量消耗上限 (GB)"
                maxValue={10000}
                minValue={0.1}
                step={0.1}
                value={downloadLimit}
                onChange={(value) => setDownloadLimit(value as number)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                循环下载
              </label>
              <Switch isSelected={isLooping} onValueChange={setIsLooping} />
            </div>
          </div>

          {/* 下载状态 */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-xl font-semibold">下载状态</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">已消耗流量</p>
                <p className="text-lg font-semibold">
                  {totalDownloadedMB.toFixed(2)} MB
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">剩余流量</p>
                <p className="text-lg font-semibold">
                  {remainingDataMB.toFixed(2)} MB
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">当前下载</p>
                <p className="text-lg font-semibold">
                  {isDownloading ? getCurrentDownloadName() : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">预计剩余时间</p>
                <p className="text-lg font-semibold">
                  {isDownloading ? formatTime(estimatedTime) : "-"}
                </p>
              </div>
            </div>

            {isDownloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    进度: {currentProgress.loadedMB.toFixed(2)} MB
                    {currentProgress.totalMB &&
                      ` / ${currentProgress.totalMB.toFixed(2)} MB`}
                  </span>
                  <span>速度: {currentProgress.speedMbps.toFixed(2)} Mbps</span>
                </div>
                <div className="w-full bg-default-200 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-150 ease-linear"
                    style={{ width: `${currentProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-danger text-center">错误: {error}</p>
            )}

            <div className="flex justify-center space-x-4 pt-2">
              {!isDownloading ? (
                <Button
                  color="primary"
                  isDisabled={isStartButtonDisabled}
                  onPress={handleStartDownload}
                >
                  {isStartButtonDisabled ? "已达上限" : "开始下载"}
                </Button>
              ) : (
                <Button color="danger" onPress={stop}>
                  停止下载
                </Button>
              )}
              <Button color="secondary" onPress={reset}>
                重置
              </Button>
            </div>
          </div>

          {/* 下载历史 */}
          {history.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-xl font-semibold">下载历史</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 bg-default-100 rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        title={item.url}
                      >
                        {item.url}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.timestamp.toLocaleString()} -{" "}
                        {item.size.toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
