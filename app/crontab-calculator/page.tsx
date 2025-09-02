"use client";

import { useState } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";

interface CronResult {
  nextRuns: string[];
  description: string;
  isValid: boolean;
  error?: string;
}

export default function CronTabCalculatorPage() {
  const [cronExpression, setCronExpression] = useState("");
  const [result, setResult] = useState<CronResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [runCount, setRunCount] = useState(10);

  const parseCronExpression = (expression: string): CronResult => {
    // 基本的crontab表达式验证 - 支持所有合法的crontab格式
    const cronRegex =
      /^(\*|\d+([\/-]\d+)?(,\d+([\/-]\d+)?)*|\*\/\d+)(\s+(\*|\d+([\/-]\d+)?(,\d+([\/-]\d+)?)*|\*\/\d+)){4}$/;

    if (!cronRegex.test(expression.trim())) {
      return {
        isValid: false,
        error: "无效的crontab表达式格式",
        nextRuns: [],
        description: "",
      };
    }

    try {
      const parts = expression.trim().split(/\s+/);

      if (parts.length !== 5) {
        return {
          isValid: false,
          error: "crontab表达式应该包含5个部分：分钟 小时 日 月 星期",
          nextRuns: [],
          description: "",
        };
      }

      const [minute, hour, day, month, weekday] = parts;

      // 生成描述
      const description = generateCronDescription(
        minute,
        hour,
        day,
        month,
        weekday,
      );

      // 计算下次运行时间
      const nextRuns = calculateNextRuns(
        minute,
        hour,
        day,
        month,
        weekday,
        runCount,
      );

      return {
        isValid: true,
        description,
        nextRuns,
        error: undefined,
      };
    } catch (_error) {
      return {
        isValid: false,
        error: "解析crontab表达式时发生错误",
        nextRuns: [],
        description: "",
      };
    }
  };

  const generateCronDescription = (
    minute: string,
    hour: string,
    day: string,
    month: string,
    weekday: string,
  ): string => {
    const parts = [minute, hour, day, month, weekday];
    const names = ["分钟", "小时", "日", "月", "星期"];

    let description = "在";

    parts.forEach((part, index) => {
      if (part === "*") {
        description += `每${names[index]}`;
      } else if (part.includes("/")) {
        const [base, interval] = part.split("/");

        description += `每${interval}${names[index]}`;
        if (base !== "*") {
          description += `（从${base}开始）`;
        }
      } else if (part.includes("-")) {
        const [start, end] = part.split("-");

        description += `${names[index]}${start}-${end}`;
      } else if (part.includes(",")) {
        const values = part.split(",");

        description += `${names[index]}${values.join("、")}`;
      } else {
        description += `${names[index]}${part}`;
      }

      if (index < parts.length - 1) {
        description += "、";
      }
    });

    description += "执行";

    return description;
  };

  const calculateNextRuns = (
    minute: string,
    hour: string,
    day: string,
    month: string,
    weekday: string,
    count: number,
  ): string[] => {
    const runs: string[] = [];
    const now = new Date();
    let currentTime = new Date(now);

    // 解析分钟部分
    let minuteInterval = 1;
    let minuteBase = 0;

    if (minute.includes("/")) {
      const [base, interval] = minute.split("/");

      minuteInterval = parseInt(interval);
      minuteBase = base === "*" ? 0 : parseInt(base);
    } else if (minute !== "*") {
      minuteBase = parseInt(minute);
      minuteInterval = 60; // 固定分钟，相当于每小时一次
    }

    // 解析小时部分
    let hourInterval = 1;
    let hourBase = 0;

    if (hour.includes("/")) {
      const [base, interval] = hour.split("/");

      hourInterval = parseInt(interval);
      hourBase = base === "*" ? 0 : parseInt(base);
    } else if (hour !== "*") {
      hourBase = parseInt(hour);
      hourInterval = 24; // 固定小时，相当于每天一次
    }

    for (let i = 0; i < count; i++) {
      const nextTime = new Date(currentTime);

      // 设置分钟
      if (minute !== "*") {
        let targetMinute = minuteBase;

        if (minute.includes("/")) {
          // 对于 */30 这样的表达式，找到下一个符合条件的分钟
          const currentMinute = nextTime.getMinutes();
          const minutesFromBase = (currentMinute - minuteBase + 60) % 60;
          const minutesToNext =
            minuteInterval - (minutesFromBase % minuteInterval);

          if (minutesToNext === minuteInterval && minutesFromBase > 0) {
            targetMinute = minuteBase;
            nextTime.setHours(nextTime.getHours() + 1);
          } else {
            targetMinute = currentMinute + minutesToNext;
            if (targetMinute >= 60) {
              targetMinute = minuteBase;
              nextTime.setHours(nextTime.getHours() + 1);
            }
          }
        }
        nextTime.setMinutes(targetMinute);
      }

      // 设置小时
      if (hour !== "*") {
        if (hour.includes("/")) {
          const currentHour = nextTime.getHours();
          const hoursFromBase = (currentHour - hourBase + 24) % 24;
          const hoursToNext = hourInterval - (hoursFromBase % hourInterval);

          if (hoursToNext === hourInterval && hoursFromBase > 0) {
            nextTime.setHours(hourBase);
            nextTime.setDate(nextTime.getDate() + 1);
          } else {
            nextTime.setHours(currentHour + hoursToNext);
          }
        } else {
          nextTime.setHours(hourBase);
        }
      }

      // 如果时间已经过了，加到下一个周期
      if (nextTime <= currentTime) {
        if (minute.includes("/")) {
          // 对于分钟间隔的情况，加上间隔时间
          nextTime.setTime(nextTime.getTime() + minuteInterval * 60 * 1000);
        } else if (hour.includes("/")) {
          // 对于小时间隔的情况，加上间隔时间
          nextTime.setTime(nextTime.getTime() + hourInterval * 60 * 60 * 1000);
        } else {
          // 默认加一天
          nextTime.setDate(nextTime.getDate() + 1);
        }
      }

      runs.push(nextTime.toLocaleString("zh-CN"));
      currentTime = new Date(nextTime);
    }

    return runs;
  };

  const handleSubmit = () => {
    if (!cronExpression.trim()) {
      setResult({
        isValid: false,
        error: "请输入crontab表达式",
        nextRuns: [],
        description: "",
      });

      return;
    }

    setLoading(true);

    // 模拟异步处理
    setTimeout(() => {
      const parsedResult = parseCronExpression(cronExpression);

      setResult(parsedResult);
      setLoading(false);
    }, 500);
  };

  const handlePresetSelect = (preset: string) => {
    setCronExpression(preset);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_err) {
      // 复制失败处理
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <h1 className="text-2xl font-bold">Crontab时间计算器</h1>
          <p className="text-default-500 mt-2">
            解析crontab表达式，计算下次执行时间，生成可读的时间描述
          </p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* 预设表达式 */}
          <div className="space-y-2">
            <div className="text-sm font-medium">常用表达式</div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="flat"
                onClick={() => handlePresetSelect("0 0 * * *")}
              >
                每天午夜
              </Button>
              <Button
                size="sm"
                variant="flat"
                onClick={() => handlePresetSelect("0 */6 * * *")}
              >
                每6小时
              </Button>
              <Button
                size="sm"
                variant="flat"
                onClick={() => handlePresetSelect("*/30 * * * *")}
              >
                每30分钟
              </Button>
              <Button
                size="sm"
                variant="flat"
                onClick={() => handlePresetSelect("0 9 * * 1-5")}
              >
                工作日早上9点
              </Button>
              <Button
                size="sm"
                variant="flat"
                onClick={() => handlePresetSelect("0 0 1 * *")}
              >
                每月1号
              </Button>
            </div>
          </div>

          {/* 输入区域 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="cron-expression">
                Crontab表达式
              </label>
              <Input
                className="font-mono"
                id="cron-expression"
                placeholder="例如: 0 0 * * *"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
              />
              <p className="text-xs text-default-500">
                格式：分钟 小时 日 月 星期（例如：0 0 * * * 表示每天午夜执行）
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="run-count">
                显示运行次数
              </label>
              <Select
                id="run-count"
                selectedKeys={[runCount.toString()]}
                onSelectionChange={(keys) =>
                  setRunCount(parseInt(Array.from(keys)[0] as string))
                }
              >
                <SelectItem key="5">5次</SelectItem>
                <SelectItem key="10">10次</SelectItem>
                <SelectItem key="20">20次</SelectItem>
                <SelectItem key="50">50次</SelectItem>
              </Select>
            </div>

            <Button
              className="w-full"
              color="primary"
              disabled={!cronExpression.trim() || loading}
              isLoading={loading}
              onClick={handleSubmit}
            >
              解析表达式
            </Button>
          </div>

          {/* 结果展示 */}
          {result && (
            <div className="space-y-4">
              {result.error && (
                <Card className="bg-danger-50">
                  <CardBody>
                    <p className="text-danger">{result.error}</p>
                  </CardBody>
                </Card>
              )}

              {result.isValid && (
                <>
                  <Card>
                    <CardBody>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">表达式描述</h3>
                        <p className="text-default-700">{result.description}</p>
                      </div>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-lg">
                            下次运行时间
                          </h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() =>
                              copyToClipboard(result.nextRuns.join("\n"))
                            }
                          >
                            复制全部
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {result.nextRuns.map((runTime, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center p-2 bg-default-50 rounded"
                            >
                              <span className="text-sm">
                                第{index + 1}次运行
                              </span>
                              <span className="font-mono text-sm">
                                {runTime}
                              </span>
                              <Button
                                size="sm"
                                variant="light"
                                onClick={() => copyToClipboard(runTime)}
                              >
                                复制
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* 帮助信息 */}
          <Card className="bg-default-50">
            <CardBody>
              <div className="space-y-2">
                <h3 className="font-semibold">Crontab表达式格式说明</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    \{" "}
                    <p>
                      <strong>分钟 (0-59):</strong> 执行的分钟
                    </p>
                    \{" "}
                    <p>
                      <strong>小时 (0-23):</strong> 执行的小时
                    </p>
                    \{" "}
                    <p>
                      <strong>日 (1-31):</strong> 执行的日期
                    </p>
                    \{" "}
                  </div>
                  \{" "}
                  <div>
                    \{" "}
                    <p>
                      <strong>月 (1-12):</strong> 执行的月份
                    </p>
                    \{" "}
                    <p>
                      <strong>星期 (0-7):</strong> 执行的星期（0和7都表示周日）
                    </p>
                    \{" "}
                  </div>
                </div>
                <div className="mt-2">
                  \{" "}
                  <p>
                    <strong>特殊字符:</strong>
                  </p>
                  <p>
                    <code>*</code> - 任意值
                  </p>
                  <p>
                    <code>/</code> - 步长值（如 */5 表示每5个单位）
                  </p>
                  <p>
                    <code>-</code> - 范围（如 1-5 表示1到5）
                  </p>
                  <p>
                    <code>,</code> - 列表（如 1,3,5 表示1、3、5）
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </CardBody>
      </Card>
    </div>
  );
}
