"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Input,
  Card,
  CardHeader,
  CardBody,
  Button,
  Switch,
  Select,
  SelectItem,
  Slider,
} from "@heroui/react";

import { PRESET_DOWNLOADS } from "./constants";
import { useTrafficConsumer } from "./hooks/use-traffic-consumer";
import { formatFileSize, formatDownloadSpeed, formatTime } from "./utils/formatters";

export default function TrafficConsumerPage() {
  const [selectedDownload, setSelectedDownload] = useState("default");
  const [customUrl, setCustomUrl] = useState("");

  const {
    state,
    start,
    stop,
    reset,
    setUrl,
    setThreadCount,
    setIsInfinite,
  } = useTrafficConsumer();

  const {
    url,
    threadCount,
    isInfinite,
    isRunning,
    totalWastedBytes,
    currentSpeedBps,
    runningTimeSeconds,
    error,
  } = state;

  // 处理资源选择变化
  const handleDownloadChange = useCallback(
    (keys: any) => {
      const selectedKey = Array.from(keys)[0] as string;
      setSelectedDownload(selectedKey);

      if (selectedKey === "custom") {
        if (customUrl) {
          setUrl(customUrl);
        }
      } else {
        const resource = PRESET_DOWNLOADS.find((item) => item.key === selectedKey);
        if (resource) {
          setUrl(resource.url);
        }
      }
    },
    [customUrl, setUrl],
  );

  // 处理自定义 URL 变化
  const handleCustomUrlChange = useCallback(
    (value: string) => {
      setCustomUrl(value);
      if (selectedDownload === "custom") {
        setUrl(value);
      }
    },
    [selectedDownload, setUrl],
  );

  // 切换运行状态
  const handleToggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }, [isRunning, start, stop]);

  // 格式化显示
  const wastedSize = useMemo(
    () => formatFileSize(totalWastedBytes),
    [totalWastedBytes],
  );

  const speedDisplay = useMemo(
    () => formatDownloadSpeed(currentSpeedBps),
    [currentSpeedBps],
  );

  const timeDisplay = useMemo(
    () => formatTime(runningTimeSeconds),
    [runningTimeSeconds],
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Card className="max-w-2xl w-full p-4">
        <CardHeader className="flex justify-center">
          <h1 className="text-2xl font-bold">流量消耗器</h1>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* 配置区域 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">下载配置</h2>

            <Select
              label="选择下载资源"
              selectedKeys={[selectedDownload]}
              onSelectionChange={handleDownloadChange}
              isDisabled={isRunning}
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
                onValueChange={handleCustomUrlChange}
                isDisabled={isRunning}
              />
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">
                线程数: {threadCount}
              </label>
              <Slider
                className="max-w-md"
                label="线程数"
                maxValue={32}
                minValue={1}
                step={1}
                value={threadCount}
                onChange={(value) => setThreadCount(value as number)}
                isDisabled={isRunning}
              />
              <p className="text-xs text-gray-500 mt-1">
                提示：线程数越多，下载速度越快（建议 3-10 个）
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                无限循环
              </label>
              <Switch
                isSelected={isInfinite}
                onValueChange={setIsInfinite}
                isDisabled={isRunning}
              />
            </div>
          </div>

          {/* 状态显示区域 */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-xl font-semibold">运行状态</h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-default-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">已消失的流量</p>
                <p className="text-2xl font-bold">{wastedSize}</p>
              </div>

              <div className="text-center p-4 bg-default-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">每秒实时流量</p>
                <p className="text-2xl font-bold text-primary">{speedDisplay}</p>
              </div>

              <div className="text-center p-4 bg-default-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">运行时长</p>
                <p className="text-2xl font-bold">{timeDisplay}</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <div className="flex justify-center space-x-4 pt-2">
              <Button
                color={isRunning ? "danger" : "primary"}
                size="lg"
                onPress={handleToggle}
              >
                {isRunning ? "停止" : "开始"}
              </Button>
              <Button
                color="secondary"
                size="lg"
                onPress={reset}
                isDisabled={isRunning}
              >
                重置
              </Button>
            </div>
          </div>

          {/* 说明区域 */}
          <div className="space-y-2 pt-4 border-t text-sm text-gray-600">
            <p>
              <strong>说明：</strong>本工具通过多线程循环下载资源来消耗流量。
            </p>
            <p>
              <strong>提示：</strong>
              如手机套餐内含定向流量（如头条系、阿里系、百度系等），选择对应的节点即可消耗免费定向流量。
            </p>
            <p>
              <strong>注意：</strong>
              自定义下载地址需支持跨域访问，不支持网盘资源解析。
            </p>
          </div>

          {/* 源码参考 */}
          <div className="pt-4 border-t text-center text-xs text-gray-500">
            <p>
              源码参考：{" "}
              <a
                href="https://github.com/uu6/llxhq"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://github.com/uu6/llxhq
              </a>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
