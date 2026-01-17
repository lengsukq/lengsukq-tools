"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Input, Card, CardHeader, CardBody, Button, Switch, Select, SelectItem, Slider } from "@heroui/react";

import { PRESET_DOWNLOADS } from "./constants";
import { useTrafficDownloader } from "./hooks/use-traffic-downloader";

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
