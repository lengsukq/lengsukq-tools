"use client";

import React, { useCallback, useEffect, useState, useId } from "react"; // 导入 useId
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Switch } from "@heroui/switch";

export default function ElectricityCalculatorPage() {
  const [powerConsumption, setPowerConsumption] = useState("");
  const [pricePerKWH, setPricePerKWH] = useState("");
  const [dailyRunTime, setDailyRunTime] = useState("");
  const [period, setPeriod] = useState("day"); // 默认周期

  const [result, setResult] = useState(0);

  // 峰谷电价相关状态
  const [enablePeakValley, setEnablePeakValley] = useState(false);
  const [peakPricePerKWH, setPeakPricePerKWH] = useState("");
  const [valleyPricePerKWH, setValleyPricePerKWH] = useState("");
  const [peakRunTime, setPeakRunTime] = useState("");
  const [valleyRunTime, setValleyRunTime] = useState("");

  // 自定义周期倍数相关状态
  const [enableCustomPeriodMultiplier, setEnableCustomPeriodMultiplier] =
    useState(false);
  const [customMultiplier, setCustomMultiplier] = useState("");

  // 使用 useId 生成唯一的 ID
  const enablePeakValleySwitchId = useId();
  const enableCustomPeriodMultiplierSwitchId = useId();

  const calculateElectricityCost = useCallback(() => {
    const power = parseFloat(powerConsumption);

    if (isNaN(power) || power <= 0) {
      setResult(0);

      return;
    }

    let dailyCost = 0;

    if (enablePeakValley) {
      const peakPrice = parseFloat(peakPricePerKWH);
      const valleyPrice = parseFloat(valleyPricePerKWH);
      const peakHours = parseFloat(peakRunTime);
      const valleyHours = parseFloat(valleyRunTime);

      if (
        isNaN(peakPrice) ||
        isNaN(valleyPrice) ||
        isNaN(peakHours) ||
        isNaN(valleyHours)
      ) {
        setResult(0);

        return;
      }

      const peakKWHPerDay = (power * peakHours) / 1000;
      const valleyKWHPerDay = (power * valleyHours) / 1000;

      dailyCost = peakKWHPerDay * peakPrice + valleyKWHPerDay * valleyPrice;
    } else {
      const price = parseFloat(pricePerKWH);
      const runTime = parseFloat(dailyRunTime);

      if (isNaN(price) || isNaN(runTime)) {
        setResult(0);

        return;
      }
      const kwhPerDay = (power * runTime) / 1000;

      dailyCost = kwhPerDay * price;
    }

    // 计算基础天数（根据period选择）
    let baseDaysInPeriod = 0;

    switch (period) {
      case "day":
        baseDaysInPeriod = 1;
        break;
      case "week":
        baseDaysInPeriod = 7;
        break;
      case "month":
        baseDaysInPeriod = 30; // 简化处理，按30天计算
        break;
      case "year":
        baseDaysInPeriod = 365;
        break;
      default:
        baseDaysInPeriod = 0;
    }

    let totalDaysToCalculate = 0;

    if (enableCustomPeriodMultiplier) {
      const multiplier = parseInt(customMultiplier);

      if (isNaN(multiplier) || multiplier <= 0) {
        setResult(0);

        return;
      }
      totalDaysToCalculate = baseDaysInPeriod * multiplier; // 基础天数乘以倍数
    } else {
      totalDaysToCalculate = baseDaysInPeriod; // 不启用自定义倍数时，就是基础周期天数
    }

    setResult(dailyCost * totalDaysToCalculate);
  }, [
    powerConsumption,
    pricePerKWH,
    dailyRunTime,
    period,
    enablePeakValley,
    peakPricePerKWH,
    valleyPricePerKWH,
    peakRunTime,
    valleyRunTime,
    enableCustomPeriodMultiplier,
    customMultiplier,
  ]);

  useEffect(() => {
    calculateElectricityCost();
  }, [calculateElectricityCost]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Card className="max-w-lg w-full p-4">
        <CardHeader className="flex justify-center">
          <h1 className="text-2xl font-bold">电费计算器</h1>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="功耗 (瓦特)"
            placeholder="例如: 1000"
            type="number"
            value={powerConsumption}
            onValueChange={setPowerConsumption}
          />

          {/* 峰谷电价开关：使用 htmlFor 和 id 关联 */}
          <div className="flex items-center justify-between">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor={enablePeakValleySwitchId}
            >
              启用峰谷电价
            </label>
            <Switch
              id={enablePeakValleySwitchId} // 将生成的 ID 传递给 Switch
              isSelected={enablePeakValley}
              onValueChange={setEnablePeakValley}
            />
          </div>

          {!enablePeakValley ? (
            <>
              <Input
                label="电价 (元/千瓦时)"
                placeholder="例如: 0.5"
                type="number"
                value={pricePerKWH}
                onValueChange={setPricePerKWH}
              />
              <Input
                label="每日运行时间 (小时)"
                placeholder="例如: 8"
                type="number"
                value={dailyRunTime}
                onValueChange={setDailyRunTime}
              />
            </>
          ) : (
            <>
              <Input
                label="峰期电价 (元/千瓦时)"
                placeholder="例如: 0.8"
                type="number"
                value={peakPricePerKWH}
                onValueChange={setPeakPricePerKWH}
              />
              <Input
                label="谷期电价 (元/千瓦时)"
                placeholder="例如: 0.3"
                type="number"
                value={valleyPricePerKWH}
                onValueChange={setValleyPricePerKWH}
              />
              <Input
                label="每日峰期运行时间 (小时)"
                placeholder="例如: 6"
                type="number"
                value={peakRunTime}
                onValueChange={setPeakRunTime}
              />
              <Input
                label="每日谷期运行时间 (小时)"
                placeholder="例如: 2"
                type="number"
                value={valleyRunTime}
                onValueChange={setValleyRunTime}
              />
            </>
          )}

          <Select
            label="周期单位"
            placeholder="选择周期单位"
            selectedKeys={new Set([period])}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys).join("");

              setPeriod(selectedKey);
            }}
          >
            <SelectItem key="day">日</SelectItem>
            <SelectItem key="week">周</SelectItem>
            <SelectItem key="month">月</SelectItem>
            <SelectItem key="year">年</SelectItem>
          </Select>

          {/* 自定义周期倍数开关：使用 htmlFor 和 id 关联 */}
          <div className="flex items-center justify-between">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor={enableCustomPeriodMultiplierSwitchId}
            >
              自定义周期倍数
            </label>
            <Switch
              id={enableCustomPeriodMultiplierSwitchId} // 将生成的 ID 传递给 Switch
              isSelected={enableCustomPeriodMultiplier}
              onValueChange={setEnableCustomPeriodMultiplier}
            />
          </div>
          {enableCustomPeriodMultiplier && (
            <Input
              description={`输入您希望计算的${period === "day" ? "天数" : period === "week" ? "周数" : period === "month" ? "月数" : "年数"}`}
              label={`计算 ${period === "day" ? "天数" : period === "week" ? "周数" : period === "month" ? "月数" : "年数"}`}
              placeholder={`例如: 2 (${period === "day" ? "天" : period === "week" ? "周" : period === "month" ? "月" : "年"})`}
              type="number"
              value={customMultiplier}
              onValueChange={setCustomMultiplier}
            />
          )}

          <Card className="w-full">
            <CardHeader>计算结果</CardHeader>
            <CardBody>
              <p className="text-lg">
                预估电费:{" "}
                <span className="font-semibold">{result.toFixed(2)}</span> 元
              </p>
            </CardBody>
          </Card>
        </CardBody>
        <CardFooter>
          <p className="text-sm text-gray-500">请确保输入有效数字。</p>
          {enablePeakValley && (
            <p className="text-xs text-gray-400 mt-2">
              提示：峰期和谷期运行时间总和不一定等于24小时，这取决于设备的实际运行模式。
            </p>
          )}
          {enableCustomPeriodMultiplier && (
            <p className="text-xs text-gray-400 mt-2">
              提示：自定义周期倍数模式下，将以您选择的“周期单位”乘以输入的数字进行计算。
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
