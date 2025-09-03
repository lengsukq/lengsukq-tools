"use client";

import React, { useCallback, useEffect, useState, useId } from "react";
import { Input } from "@heroui/input";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";

export default function SalaryCalculatorPage() {
  // 保存值到localStorage
  const saveToStorage = (key: string, value: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value);
    }
  };

  // 月薪计算相关状态
  const [salaryBase, setSalaryBase] = useState(""); // 月薪基数
  const [allowance, setAllowance] = useState(""); // 每月补贴
  const [pensionRate, setPensionRate] = useState("0.08"); // 养老保险比例
  const [medicalRate, setMedicalRate] = useState("0.02"); // 医疗保险比例
  const [unemploymentRate, setUnemploymentRate] = useState("0.005"); // 失业保险比例
  const [housingFundRate, setHousingFundRate] = useState("0.12"); // 住房公积金比例
  
  // 社保缴费基数相关
  const [socialInsuranceBase, setSocialInsuranceBase] = useState(""); // 社保缴费基数
  const [useCustomBase, setUseCustomBase] = useState(false); // 是否使用自定义社保基数

  // 时薪计算相关状态
  const [dailyWorkingHours, setDailyWorkingHours] = useState("8"); // 日工作时间
  const [monthlyWorkingDays, setMonthlyWorkingDays] = useState("21.75"); // 月平均工作日

  // 年薪计算相关状态
  const [annualBonus, setAnnualBonus] = useState("");
  const [annualAllowance, setAnnualAllowance] = useState("");

  // 计算结果
  const [monthlyResult, setMonthlyResult] = useState(0); // 最终显示的月薪结果
  const [hourlyResult, setHourlyResult] = useState(0); // 时薪计算结果
  const [annualResult, setAnnualResult] = useState(0);
  const [averageMonthlySalary, setAverageMonthlySalary] = useState(0);

  // 扣除项详情
  const [pensionDeduction, setPensionDeduction] = useState(0);
  const [medicalDeduction, setMedicalDeduction] = useState(0);
  const [unemploymentDeduction, setUnemploymentDeduction] = useState(0);
  const [housingFundDeduction, setHousingFundDeduction] = useState(0);
  const [incomeTaxDeduction, setIncomeTaxDeduction] = useState(0);
  
  // 公积金是否计入工资（显示为总收入）
  const [includeHousingFund, setIncludeHousingFund] = useState(false);

  // 生成唯一ID
  const includeHousingFundSwitchId = useId();
  const useCustomBaseSwitchId = useId();

  // 计算个人所得税（使用速算扣除数优化）
  const calculateIncomeTax = (taxableIncomeBase: number): number => {
    const taxThreshold = 5000;
    
    // 如果应纳税所得额小于等于起征点，不缴税
    if (taxableIncomeBase <= taxThreshold) {
      return 0;
    }
    
    // 应纳税所得额（年度累计预扣预缴，此处简化为月度）
    const taxableAmount = taxableIncomeBase - taxThreshold;
    
    // 个人所得税税率表及速算扣除数（2023年标准）
    if (taxableAmount <= 3000) {
      return taxableAmount * 0.03 - 0;
    } else if (taxableAmount <= 12000) {
      return taxableAmount * 0.10 - 210;
    } else if (taxableAmount <= 25000) {
      return taxableAmount * 0.20 - 1410;
    } else if (taxableAmount <= 35000) {
      return taxableAmount * 0.25 - 2760;
    } else if (taxableAmount <= 55000) {
      return taxableAmount * 0.30 - 5290;
    } else if (taxableAmount <= 80000) {
      return taxableAmount * 0.35 - 15160;
    } else {
      return taxableAmount * 0.45 - 28160;
    }
  };

  const calculateSalary = useCallback(() => {
    // 保存当前值到localStorage
    saveToStorage("salaryBase", salaryBase);
    saveToStorage("allowance", allowance);
    saveToStorage("pensionRate", pensionRate);
    saveToStorage("medicalRate", medicalRate);
    saveToStorage("unemploymentRate", unemploymentRate);
    saveToStorage("housingFundRate", housingFundRate);
    saveToStorage("socialInsuranceBase", socialInsuranceBase);
    saveToStorage("useCustomBase", useCustomBase.toString());
    saveToStorage("dailyWorkingHours", dailyWorkingHours);
    saveToStorage("monthlyWorkingDays", monthlyWorkingDays);
    saveToStorage("annualBonus", annualBonus);
    saveToStorage("annualAllowance", annualAllowance);
    saveToStorage("includeHousingFund", includeHousingFund.toString());

    // --- 1. 准备基本数据 ---
    const baseSalary = parseFloat(salaryBase) || 0;
    const allowanceAmount = parseFloat(allowance) || 0;
    // 应发工资 = 月薪基数 + 补贴
    const grossMonthlyPay = baseSalary + allowanceAmount; 
    
    // 确定社保缴费基数
    const insuranceBase = useCustomBase ? (parseFloat(socialInsuranceBase) || baseSalary) : baseSalary;

    // --- 2. 计算五险一金（个人缴纳部分）---
    const pension = insuranceBase * (parseFloat(pensionRate) || 0);
    const medical = insuranceBase * (parseFloat(medicalRate) || 0);
    const unemployment = insuranceBase * (parseFloat(unemploymentRate) || 0);
    const housingFund = insuranceBase * (parseFloat(housingFundRate) || 0);
    
    // 五险一金个人缴纳总额，这部分是税前扣除的
    const totalPreTaxDeductions = pension + medical + unemployment + housingFund;

    // --- 3. 计算个人所得税 ---
    // 应纳税所得额 = 应发工资 - 五险一金个人缴纳总额
    const taxableIncomeBase = grossMonthlyPay - totalPreTaxDeductions;
    const incomeTax = calculateIncomeTax(taxableIncomeBase);

    // --- 4. 计算实际到手工资 ---
    // 实际到手工资 = 应发工资 - 五险一金 - 个人所得税
    const actualTakeHomePay = grossMonthlyPay - totalPreTaxDeductions - incomeTax;

    // --- 5. 根据开关，决定最终显示的月薪结果 ---
    let finalMonthlyResult = actualTakeHomePay;
    if (includeHousingFund) {
      // 如果计入公积金，则显示总收入 = 实际到手 + 个人公积金 + 公司公积金
      // 假设公司缴纳比例与个人相同
      const companyHousingFund = housingFund;
      finalMonthlyResult = actualTakeHomePay + housingFund + companyHousingFund;
    }

    // --- 6. 更新状态以显示结果 ---
    setMonthlyResult(finalMonthlyResult);
    
    // 更新各项扣除明细用于展示
    setPensionDeduction(pension);
    setMedicalDeduction(medical);
    setUnemploymentDeduction(unemployment);
    setHousingFundDeduction(housingFund);
    setIncomeTaxDeduction(incomeTax);

    // --- 7. 计算时薪、年薪等衍生数据 ---
    const dailyHours = parseFloat(dailyWorkingHours) || 8;
    const monthlyDays = parseFloat(monthlyWorkingDays) || 21.75;
    const hourlyWage = finalMonthlyResult / (dailyHours * monthlyDays);
    setHourlyResult(hourlyWage);
    
    const bonus = parseFloat(annualBonus) || 0;
    const annualAllowanceAmount = parseFloat(annualAllowance) || 0;
    const annualTotal = finalMonthlyResult * 12 + bonus + annualAllowanceAmount;
    setAnnualResult(annualTotal);
    setAverageMonthlySalary(annualTotal / 12);

  }, [
    salaryBase, allowance, pensionRate, medicalRate, unemploymentRate, 
    housingFundRate, socialInsuranceBase, useCustomBase, dailyWorkingHours, 
    monthlyWorkingDays, annualBonus, annualAllowance, includeHousingFund
  ]);

  useEffect(() => {
    // 在客户端加载时从localStorage中读取保存的值
    if (typeof window !== "undefined") {
      setSalaryBase(localStorage.getItem("salaryBase") || "");
      setAllowance(localStorage.getItem("allowance") || "");
      setPensionRate(localStorage.getItem("pensionRate") || "0.08");
      setMedicalRate(localStorage.getItem("medicalRate") || "0.02");
      setUnemploymentRate(localStorage.getItem("unemploymentRate") || "0.005");
      setHousingFundRate(localStorage.getItem("housingFundRate") || "0.12");
      setSocialInsuranceBase(localStorage.getItem("socialInsuranceBase") || "");
      setUseCustomBase(localStorage.getItem("useCustomBase") === "true");
      setDailyWorkingHours(localStorage.getItem("dailyWorkingHours") || "8");
      setMonthlyWorkingDays(localStorage.getItem("monthlyWorkingDays") || "21.75");
      setAnnualBonus(localStorage.getItem("annualBonus") || "");
      setAnnualAllowance(localStorage.getItem("annualAllowance") || "");
      setIncludeHousingFund(localStorage.getItem("includeHousingFund") === "true");
    }
  }, []);

  useEffect(() => {
    calculateSalary();
  }, [calculateSalary]);
  
  // 用于计算过程展示的中间变量
  const grossPayForDisplay = (parseFloat(salaryBase) || 0) + (parseFloat(allowance) || 0);
  const totalDeductionsForDisplay = pensionDeduction + medicalDeduction + unemploymentDeduction + housingFundDeduction;
  const taxableIncomeForDisplay = grossPayForDisplay - totalDeductionsForDisplay;
  const takeHomeForDisplay = grossPayForDisplay - totalDeductionsForDisplay - incomeTaxDeduction;

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
              label="月薪基数 (元)"
              placeholder="例如: 10000"
              type="number"
              value={salaryBase}
              onValueChange={setSalaryBase}
            />
             <Input
              label="补贴 (元)"
              placeholder="例如: 500"
              type="number"
              value={allowance}
              onValueChange={setAllowance}
            />

            {/* 自定义社保基数开关 */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700" htmlFor={useCustomBaseSwitchId}>
                使用自定义社保缴费基数
              </label>
              <Switch
                id={useCustomBaseSwitchId}
                isSelected={useCustomBase}
                onValueChange={setUseCustomBase}
              />
            </div>
            {useCustomBase && (
              <Input
                label="社保缴费基数 (元)"
                placeholder="若不填，则按月薪基数计算"
                type="number"
                value={socialInsuranceBase}
                onValueChange={setSocialInsuranceBase}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input label="养老保险比例" placeholder="0.08" step="0.001" type="number" value={pensionRate} onValueChange={setPensionRate} />
              <Input label="医疗保险比例" placeholder="0.02" step="0.001" type="number" value={medicalRate} onValueChange={setMedicalRate} />
              <Input label="失业保险比例" placeholder="0.005" step="0.001" type="number" value={unemploymentRate} onValueChange={setUnemploymentRate} />
              <Input label="住房公积金比例" placeholder="0.12" step="0.001" type="number" value={housingFundRate} onValueChange={setHousingFundRate} />
            </div>

            {/* 公积金是否计入工资开关 */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700" htmlFor={includeHousingFundSwitchId}>
                结果显示为月度总收入 (含公积金)
              </label>
              <Switch
                id={includeHousingFundSwitchId}
                isSelected={includeHousingFund}
                onValueChange={setIncludeHousingFund}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input label="日工作时间 (小时)" placeholder="8" step="0.1" type="number" value={dailyWorkingHours} onValueChange={setDailyWorkingHours} />
              <Input label="月平均工作日 (天)" placeholder="21.75" step="0.1" type="number" value={monthlyWorkingDays} onValueChange={setMonthlyWorkingDays} />
            </div>

            <div className="pt-2 space-y-1">
              <p className="text-lg">
                {includeHousingFund ? "月度总收入: " : "税后月薪: "}
                <span className="font-bold">¥{monthlyResult.toFixed(2)}</span>
              </p>
              <p className="text-lg">
                时薪: <span className="font-bold">¥{hourlyResult.toFixed(2)}</span>
              </p>
            </div>

            {/* 扣除详情 */}
            <div className="pt-4 space-y-2 border-t">
              <h3 className="text-lg font-semibold">扣除项详情</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>养老保险: <span className="font-medium">¥{pensionDeduction.toFixed(2)}</span></p>
                <p>医疗保险: <span className="font-medium">¥{medicalDeduction.toFixed(2)}</span></p>
                <p>失业保险: <span className="font-medium">¥{unemploymentDeduction.toFixed(2)}</span></p>
                <p>住房公积金: <span className="font-medium">¥{housingFundDeduction.toFixed(2)}</span></p>
              </div>
              <p className="font-semibold">
                个人所得税: <span className="font-bold">¥{incomeTaxDeduction.toFixed(2)}</span>
              </p>
            </div>

            {/* 工资计算过程 */}
            <div className="pt-4 space-y-2 border-t">
              <h3 className="text-lg font-semibold">工资计算过程</h3>
              <div className="space-y-1 text-sm">
                <p>1. 应发工资 (基数+补贴): <span className="font-medium">¥{grossPayForDisplay.toFixed(2)}</span></p>
                <p>2. 五险一金个人缴纳: <span className="font-medium">¥{totalDeductionsForDisplay.toFixed(2)}</span></p>
                <p>3. 应纳税所得额 (1 - 2): <span className="font-medium">¥{taxableIncomeForDisplay > 0 ? taxableIncomeForDisplay.toFixed(2) : '0.00'}</span></p>
                <p>4. 个人所得税: <span className="font-medium">¥{incomeTaxDeduction.toFixed(2)}</span></p>
                <p className="font-semibold pt-2">
                  税后到手工资 (1 - 2 - 4): <span className="font-bold text-base">¥{takeHomeForDisplay.toFixed(2)}</span>
                </p>
                {includeHousingFund && (
                  <p className="font-semibold pt-2">
                    月度总收入 (到手+个人公积金+公司公积金): 
                    <span className="font-bold text-base"> ¥{monthlyResult.toFixed(2)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h2 className="text-xl font-semibold">年薪计算</h2>
            <Input label="年终奖 (元)" placeholder="20000" type="number" value={annualBonus} onValueChange={setAnnualBonus} />
            <Input label="年福利补贴 (元)" placeholder="5000" type="number" value={annualAllowance} onValueChange={setAnnualAllowance} />
            <div className="pt-2 space-y-1">
              <p className="text-lg">
                年度总收入: <span className="font-bold">¥{annualResult.toFixed(2)}</span>
              </p>
              <p className="text-lg">
                平均月薪: <span className="font-bold">¥{averageMonthlySalary.toFixed(2)}</span>
              </p>
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