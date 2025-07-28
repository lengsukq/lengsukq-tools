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
  const [salaryBase, setSalaryBase] = useState(''); // 基数
  const [pensionRate, setPensionRate] = useState('0.08'); // 养老保险比例
  const [medicalRate, setMedicalRate] = useState('0.02'); // 医疗保险比例
  const [unemploymentRate, setUnemploymentRate] = useState('0.005'); // 失业保险比例
  const [housingFundRate, setHousingFundRate] = useState('0.12'); // 住房公积金比例
  const [allowance, setAllowance] = useState('');
  
  // 时薪计算相关状态
  const [dailyWorkingHours, setDailyWorkingHours] = useState('8'); // 日工作时间
  const [monthlyWorkingDays, setMonthlyWorkingDays] = useState('21.75'); // 月平均工作日
  const [baseRatio, setBaseRatio] = useState('1'); // 基数比例
  const [showBaseRatio, setShowBaseRatio] = useState(false); // 是否显示基数比例输入框
  
  // 年薪计算相关状态
  const [annualBonus, setAnnualBonus] = useState('');
  const [annualAllowance, setAnnualAllowance] = useState('');
  
  // 计算结果
  const [monthlyResult, setMonthlyResult] = useState(0);
  const [hourlyResult, setHourlyResult] = useState(0); // 时薪计算结果
  const [annualResult, setAnnualResult] = useState(0);
  const [averageMonthlySalary, setAverageMonthlySalary] = useState(0);
  
  // 五险一金扣除详情
  const [pensionDeduction, setPensionDeduction] = useState(0); // 养老保险扣除
  const [medicalDeduction, setMedicalDeduction] = useState(0); // 医疗保险扣除
  const [unemploymentDeduction, setUnemploymentDeduction] = useState(0); // 失业保险扣除
  const [housingFundDeduction, setHousingFundDeduction] = useState(0); // 住房公积金扣除
  const [insuranceTotalDeduction, setInsuranceTotalDeduction] = useState(0); // 保险总扣除
  
  // 公积金是否计入工资
  const [includeHousingFund, setIncludeHousingFund] = useState(false);
  
  // 生成唯一ID用于Switch组件
  const includeHousingFundSwitchId = useId();
  const baseRatioSwitchId = useId();
  const showBaseRatioSwitchId = useId();

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
    saveToStorage('baseRatio', baseRatio);
    saveToStorage('annualBonus', annualBonus);
    saveToStorage('annualAllowance', annualAllowance);
    saveToStorage('includeHousingFund', includeHousingFund.toString());
    saveToStorage('showBaseRatio', showBaseRatio.toString());

    // 月薪计算
    const base = parseFloat(salaryBase) || 0;
    const baseRatioValue = parseFloat(baseRatio) || 1; // 基数比例值，空字符串或无效值时默认为1
    const adjustedBase = base * baseRatioValue; // 调整后的基数
    const pension = adjustedBase * parseFloat(pensionRate) || 0;
    const medical = adjustedBase * parseFloat(medicalRate) || 0;
    const unemployment = adjustedBase * parseFloat(unemploymentRate) || 0;
    const housingFund = adjustedBase * parseFloat(housingFundRate) || 0;
    
    // 根据开关状态决定是否将公积金计入扣除项
    const insuranceTotal = pension + medical + unemployment + (includeHousingFund ? 0 : housingFund);
    const allowanceAmount = parseFloat(allowance) || 0;
    
    // 计算税后工资，如果公积金计入工资，则加上个人和公司缴纳的公积金
    const monthlyTakeHome = adjustedBase - insuranceTotal + allowanceAmount + (includeHousingFund ? housingFund * 2 : 0);
    setMonthlyResult(monthlyTakeHome);
    
    // 保存五险一金扣除详情用于展示
    setPensionDeduction(pension);
    setMedicalDeduction(medical);
    setUnemploymentDeduction(unemployment);
    setHousingFundDeduction(housingFund);
    setInsuranceTotalDeduction(insuranceTotal);
    
    // 时薪计算
    const dailyHours = parseFloat(dailyWorkingHours) || 8;
    const monthlyDays = parseFloat(monthlyWorkingDays) || 21.75;
    const hourlyWage = monthlyTakeHome / (dailyHours * monthlyDays);
    setHourlyResult(hourlyWage);
    
    // 年薪计算
    const bonus = parseFloat(annualBonus) || 0;
    const annualAllowanceAmount = parseFloat(annualAllowance) || 0;
    const annualTotal = monthlyTakeHome * 12 + bonus + annualAllowanceAmount;
    
    setAnnualResult(annualTotal);
    setAverageMonthlySalary(annualTotal / 12);
  }, [salaryBase, pensionRate, medicalRate, unemploymentRate, housingFundRate, allowance, annualBonus, annualAllowance, includeHousingFund, dailyWorkingHours, monthlyWorkingDays, baseRatio]);

  useEffect(() => {
    // 在客户端加载时从localStorage中读取保存的值
    if (typeof window !== 'undefined') {
      const storedIncludeHousingFund = localStorage.getItem('includeHousingFund');
      if (storedIncludeHousingFund !== null) {
        setIncludeHousingFund(storedIncludeHousingFund === 'true');
      }
      
      const storedShowBaseRatio = localStorage.getItem('showBaseRatio');
      if (storedShowBaseRatio !== null) {
        setShowBaseRatio(storedShowBaseRatio === 'true');
      }
      
      const storedSalaryBase = localStorage.getItem('salaryBase');
      if (storedSalaryBase !== null) {
        setSalaryBase(storedSalaryBase);
      }
      
      const storedPensionRate = localStorage.getItem('pensionRate');
      if (storedPensionRate !== null) {
        setPensionRate(storedPensionRate);
      }
      
      const storedMedicalRate = localStorage.getItem('medicalRate');
      if (storedMedicalRate !== null) {
        setMedicalRate(storedMedicalRate);
      }
      
      const storedUnemploymentRate = localStorage.getItem('unemploymentRate');
      if (storedUnemploymentRate !== null) {
        setUnemploymentRate(storedUnemploymentRate);
      }
      
      const storedHousingFundRate = localStorage.getItem('housingFundRate');
      if (storedHousingFundRate !== null) {
        setHousingFundRate(storedHousingFundRate);
      }
      
      const storedAllowance = localStorage.getItem('allowance');
      if (storedAllowance !== null) {
        setAllowance(storedAllowance);
      }
      
      const storedDailyWorkingHours = localStorage.getItem('dailyWorkingHours');
      if (storedDailyWorkingHours !== null) {
        setDailyWorkingHours(storedDailyWorkingHours);
      }
      
      const storedMonthlyWorkingDays = localStorage.getItem('monthlyWorkingDays');
      if (storedMonthlyWorkingDays !== null) {
        setMonthlyWorkingDays(storedMonthlyWorkingDays);
      }
      
      const storedBaseRatio = localStorage.getItem('baseRatio');
      if (storedBaseRatio !== null) {
        setBaseRatio(storedBaseRatio);
      }
      
      const storedAnnualBonus = localStorage.getItem('annualBonus');
      if (storedAnnualBonus !== null) {
        setAnnualBonus(storedAnnualBonus);
      }
      
      const storedAnnualAllowance = localStorage.getItem('annualAllowance');
      if (storedAnnualAllowance !== null) {
        setAnnualAllowance(storedAnnualAllowance);
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
            {/* 基数比例是否展示开关 */}
            <div className="flex items-center justify-between">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor={showBaseRatioSwitchId}
              >
                是否使用基数比例
              </label>
              <Switch
                id={showBaseRatioSwitchId}
                isSelected={showBaseRatio}
                onValueChange={(value) => {
                  setShowBaseRatio(value);
                  // 如果关闭开关，重置基数比例为100%
                  if (!value) {
                    setBaseRatio('1');
                    saveToStorage('baseRatio', '1');
                  }
                }}
              />
            </div>
            {showBaseRatio && (
              <Input
                label="基数比例 (%)"
                placeholder="例如: 100"
                type="number"
                min="0"
                max="100"
                value={baseRatio === '' ? '' : (parseFloat(baseRatio) * 100).toString()}
                onValueChange={(value) => {
                  // 允许空字符串输入
                  if (value === '') {
                    setBaseRatio('');
                    saveToStorage('baseRatio', '');
                    return;
                  }
                  
                  // 限制输入范围在0-100之间
                  const numValue = parseFloat(value);
                  if (!isNaN(numValue)) {
                    const clampedValue = Math.min(100, Math.max(0, numValue));
                    const ratioValue = (clampedValue / 100).toString();
                    setBaseRatio(ratioValue);
                    saveToStorage('baseRatio', ratioValue);
                  }
                }}
                onBlur={() => {
                  // 失焦时如果为空，默认为100%
                  if (baseRatio === '' || baseRatio === '0') {
                    setBaseRatio('1');
                    saveToStorage('baseRatio', '1');
                  }
                  // 触发重新计算
                  calculateSalary();
                }}
              />
            )}
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
            
            {/* 五险一金扣除详情 */}
            <div className="pt-4 space-y-2 border-t">
              <h3 className="text-lg font-semibold">五险一金扣除详情</h3>
              <div className="grid grid-cols-2 gap-2">
                <p>养老保险: <span className="font-medium">¥{pensionDeduction.toFixed(2)}</span></p>
                <p>医疗保险: <span className="font-medium">¥{medicalDeduction.toFixed(2)}</span></p>
                <p>失业保险: <span className="font-medium">¥{unemploymentDeduction.toFixed(2)}</span></p>
                <p>住房公积金: <span className="font-medium">¥{housingFundDeduction.toFixed(2)}</span></p>
              </div>
              <p className="font-semibold">保险总扣除: <span className="font-bold">¥{insuranceTotalDeduction.toFixed(2)}</span></p>
            </div>
            
            {/* 工资计算过程 */}
            <div className="pt-4 space-y-2 border-t">
              <h3 className="text-lg font-semibold">工资计算过程</h3>
              <div className="space-y-1 text-sm">
                <p>1. 基数: <span className="font-medium">¥{parseFloat(salaryBase || '0').toFixed(2)}</span></p>
                <p>2. 保险扣除: <span className="font-medium">¥{insuranceTotalDeduction.toFixed(2)}</span></p>
                <p>3. 补贴: <span className="font-medium">¥{parseFloat(allowance || '0').toFixed(2)}</span></p>
                <p>4. 公积金调整: <span className="font-medium">{includeHousingFund ? '¥' + (housingFundDeduction * 2).toFixed(2) : '¥0.00'}</span></p>
                <p className="font-semibold pt-2">税后月薪 = 基数 - 保险扣除 + 补贴 + 公积金调整</p>
                <p className="font-semibold">税后月薪 = ¥{monthlyResult.toFixed(2)}</p>
              </div>
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
            <Input
              label="年福利补贴 (元)"
              placeholder="例如: 5000"
              type="number"
              value={annualAllowance}
              onValueChange={setAnnualAllowance}
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