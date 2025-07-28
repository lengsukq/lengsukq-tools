"use client";

import React, { useCallback, useEffect, useState, useId } from "react";
import { Input } from "@heroui/input";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";

export default function SalaryCalculatorPage() {
  // 从localStorage获取保存的值或使用默认值
  const getStoredValue = (key: string, defaultValue: string) => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem(key);
      return storedValue !== null ? storedValue : defaultValue;
    }
    return defaultValue;
  };

  // 保存值到localStorage
  const saveToStorage = (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  };

  // 月薪计算相关状态
  const [salaryBase, setSalaryBase] = useState(getStoredValue('salaryBase', '')); // 基数
  const [pensionRate, setPensionRate] = useState(getStoredValue('pensionRate', '0.08')); // 养老保险比例
  const [medicalRate, setMedicalRate] = useState(getStoredValue('medicalRate', '0.02')); // 医疗保险比例
  const [unemploymentRate, setUnemploymentRate] = useState(getStoredValue('unemploymentRate', '0.005')); // 失业保险比例
  const [housingFundRate, setHousingFundRate] = useState(getStoredValue('housingFundRate', '0.12')); // 住房公积金比例
  const [allowance, setAllowance] = useState(getStoredValue('allowance', ''));
  
  // 时薪计算相关状态
  const [dailyWorkingHours, setDailyWorkingHours] = useState(getStoredValue('dailyWorkingHours', '8')); // 日工作时间
  const [monthlyWorkingDays, setMonthlyWorkingDays] = useState(getStoredValue('monthlyWorkingDays', '21.75')); // 月平均工作日
  
  // 年薪计算相关状态
  const [annualBonus, setAnnualBonus] = useState(getStoredValue('annualBonus', ''));
  
  // 计算结果
  const [monthlyResult, setMonthlyResult] = useState(0);
  const [hourlyResult, setHourlyResult] = useState(0); // 时薪计算结果
  const [annualResult, setAnnualResult] = useState(0);
  const [averageMonthlySalary, setAverageMonthlySalary] = useState(0);
  
  // 公积金是否计入工资
  const [includeHousingFund, setIncludeHousingFund] = useState(false);
  
  // 生成唯一ID用于Switch组件
  const includeHousingFundSwitchId = useId();

  const calculateSalary = useCallback(() => {
    // 保存当前值到localStorage
    saveToStorage('salaryBase', salaryBase);
    saveToStorage('pensionRate', pensionRate);
    saveToStorage('medicalRate', medicalRate);
    saveToStorage('unemploymentRate', unemploymentRate);
    saveToStorage('housingFundRate', housingFundRate);
    saveToStorage('allowance', allowance);
    saveToStorage('dailyWorkingHours', dailyWorkingHours);
    saveToStorage('monthlyWorkingDays', monthlyWorkingDays);
    saveToStorage('annualBonus', annualBonus);
    saveToStorage('includeHousingFund', includeHousingFund.toString());

    // 月薪计算
    const base = parseFloat(salaryBase) || 0;
    const pension = base * parseFloat(pensionRate) || 0;
    const medical = base * parseFloat(medicalRate) || 0;
    const unemployment = base * parseFloat(unemploymentRate) || 0;
    const housingFund = base * parseFloat(housingFundRate) || 0;
    
    // 根据开关状态决定是否将公积金计入扣除项
    const insuranceTotal = pension + medical + unemployment + (includeHousingFund ? 0 : housingFund);
    const allowanceAmount = parseFloat(allowance) || 0;
    
    // 计算税后工资，如果公积金计入工资，则加上个人和公司缴纳的公积金
    const monthlyTakeHome = base - insuranceTotal + allowanceAmount + (includeHousingFund ? housingFund * 2 : 0);
    setMonthlyResult(monthlyTakeHome);
    
    // 时薪计算
    const dailyHours = parseFloat(dailyWorkingHours) || 8;
    const monthlyDays = parseFloat(monthlyWorkingDays) || 21.75;
    const hourlyWage = monthlyTakeHome / (dailyHours * monthlyDays);
    setHourlyResult(hourlyWage);
    
    // 年薪计算
    const bonus = parseFloat(annualBonus) || 0;
    const annualTotal = monthlyTakeHome * 12 + bonus;
    
    setAnnualResult(annualTotal);
    setAverageMonthlySalary(annualTotal / 12);
  }, [salaryBase, pensionRate, medicalRate, unemploymentRate, housingFundRate, allowance, annualBonus, includeHousingFund, dailyWorkingHours, monthlyWorkingDays]);

  useEffect(() => {
    // 在客户端加载时从localStorage中读取保存的值
    if (typeof window !== 'undefined') {
      const storedIncludeHousingFund = localStorage.getItem('includeHousingFund');
      if (storedIncludeHousingFund !== null) {
        setIncludeHousingFund(storedIncludeHousingFund === 'true');
      }
    }
  }, []);

  useEffect(() => {
    calculateSalary();
  }, [calculateSalary]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Card className="max-w-lg w-full p-4">
        <CardHeader className="flex justify-center">
          <h1 className="text-2xl font-bold">工资计算器</h1>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">月薪计算</h2>
            <Input
              label="基数 (元)"
              placeholder="例如: 10000"
              type="number"
              value={salaryBase}
              onValueChange={setSalaryBase}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="养老保险比例"
                placeholder="例如: 0.08"
                type="number"
                step="0.001"
                value={pensionRate}
                onValueChange={setPensionRate}
              />
              <Input
                label="医疗保险比例"
                placeholder="例如: 0.02"
                type="number"
                step="0.001"
                value={medicalRate}
                onValueChange={setMedicalRate}
              />
              <Input
                label="失业保险比例"
                placeholder="例如: 0.005"
                type="number"
                step="0.001"
                value={unemploymentRate}
                onValueChange={setUnemploymentRate}
              />
              <Input
                label="住房公积金比例"
                placeholder="例如: 0.12"
                type="number"
                step="0.001"
                value={housingFundRate}
                onValueChange={setHousingFundRate}
              />
            </div>
            {/* 公积金是否计入工资开关 */}
            <div className="flex items-center justify-between">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor={includeHousingFundSwitchId}
              >
                公积金是否计入工资
              </label>
              <Switch
                id={includeHousingFundSwitchId}
                isSelected={includeHousingFund}
                onValueChange={setIncludeHousingFund}
              />
            </div>
            <Input
              label="补贴 (元)"
              placeholder="例如: 500"
              type="number"
              value={allowance}
              onValueChange={setAllowance}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="日工作时间 (小时)"
                placeholder="例如: 8"
                type="number"
                step="0.1"
                value={dailyWorkingHours}
                onValueChange={(value) => {
                  setDailyWorkingHours(value);
                  saveToStorage('dailyWorkingHours', value);
                }}
              />
              <Input
                label="月平均工作日 (天)"
                placeholder="例如: 21.75"
                type="number"
                step="0.1"
                value={monthlyWorkingDays}
                onValueChange={(value) => {
                  setMonthlyWorkingDays(value);
                  saveToStorage('monthlyWorkingDays', value);
                }}
              />
            </div>
            <div className="pt-2 space-y-1">
              <p className="text-lg">税后月薪: <span className="font-bold">¥{monthlyResult.toFixed(2)}</span></p>
              <p className="text-lg">时薪: <span className="font-bold">¥{hourlyResult.toFixed(2)}</span></p>
            </div>
          </div>
          
          <div className="space-y-2 pt-4 border-t">
            <h2 className="text-xl font-semibold">年薪计算</h2>
            <Input
              label="年终奖 (元)"
              placeholder="例如: 20000"
              type="number"
              value={annualBonus}
              onValueChange={setAnnualBonus}
            />
            <div className="pt-2 space-y-1">
              <p className="text-lg">年薪总额: <span className="font-bold">¥{annualResult.toFixed(2)}</span></p>
              <p className="text-lg">平均月薪: <span className="font-bold">¥{averageMonthlySalary.toFixed(2)}</span></p>
            </div>
          </div>
        </CardBody>
        <CardFooter className="flex justify-center">
          <Button onPress={calculateSalary}>重新计算</Button>
        </CardFooter>
      </Card>
    </div>
  );
}