"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";

type RandomType = "integer" | "float" | "string" | "boolean" | "uuid";
type RandomResult = {
  value: string | number | boolean;
  type: RandomType;
};

export default function RandomNumberGenerator() {
  const [results, setResults] = useState<RandomResult[]>([]);
  const [count, setCount] = useState<string>("1");
  const [selectedType, setSelectedType] = useState<RandomType>("integer");
  
  // 整数范围设置
  const [minInt, setMinInt] = useState<string>("1");
  const [maxInt, setMaxInt] = useState<string>("100");
  
  // 浮点数范围设置
  const [minFloat, setMinFloat] = useState<string>("0");
  const [maxFloat, setMaxFloat] = useState<string>("1");
  const [decimalPlaces, setDecimalPlaces] = useState<string>("2");
  
  // 字符串设置
  const [stringLength, setStringLength] = useState<string>("10");
  const [includeUppercase, setIncludeUppercase] = useState<boolean>(true);
  const [includeLowercase, setIncludeLowercase] = useState<boolean>(true);
  const [includeNumbers, setIncludeNumbers] = useState<boolean>(true);
  const [includeSymbols, setIncludeSymbols] = useState<boolean>(false);

  const generateRandomInteger = () => {
    const min = parseInt(minInt) || 1;
    const max = parseInt(maxInt) || 100;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const generateRandomFloat = () => {
    const min = parseFloat(minFloat) || 0;
    const max = parseFloat(maxFloat) || 1;
    const decimals = parseInt(decimalPlaces) || 2;
    const value = Math.random() * (max - min) + min;
    return parseFloat(value.toFixed(decimals));
  };

  const generateRandomString = () => {
    const length = parseInt(stringLength) || 10;
    let charset = "";
    
    if (includeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (includeLowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (includeNumbers) charset += "0123456789";
    if (includeSymbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    
    if (charset === "") charset = "abcdefghijklmnopqrstuvwxyz"; // 默认只包含小写字母
    
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  };

  const generateRandomBoolean = () => {
    return Math.random() < 0.5;
  };

  const generateRandomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const generateRandomValues = () => {
    const numCount = Math.min(Math.max(parseInt(count) || 1, 1), 100); // 限制在1-100之间
    const newResults: RandomResult[] = [];
    
    for (let i = 0; i < numCount; i++) {
      let value: string | number | boolean;
      
      switch (selectedType) {
        case "integer":
          value = generateRandomInteger();
          break;
        case "float":
          value = generateRandomFloat();
          break;
        case "string":
          value = generateRandomString();
          break;
        case "boolean":
          value = generateRandomBoolean();
          break;
        case "uuid":
          value = generateRandomUUID();
          break;
        default:
          value = generateRandomInteger();
      }
      
      newResults.push({ value, type: selectedType });
    }
    
    setResults(newResults);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const getTypeLabel = (type: RandomType) => {
    switch (type) {
      case "integer": return "整数";
      case "float": return "浮点数";
      case "string": return "字符串";
      case "boolean": return "布尔值";
      case "uuid": return "UUID";
      default: return type;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <h1 className="text-2xl font-bold">随机数生成器</h1>
          <p className="text-default-500 mt-2">生成各种类型的随机数和随机值</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* 类型选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">随机类型</label>
            <Select
              selectedKeys={[selectedType]}
              onSelectionChange={(keys) => setSelectedType(Array.from(keys)[0] as RandomType)}
            >
              <SelectItem key="integer" value="integer">整数</SelectItem>
              <SelectItem key="float" value="float">浮点数</SelectItem>
              <SelectItem key="string" value="string">字符串</SelectItem>
              <SelectItem key="boolean" value="boolean">布尔值</SelectItem>
              <SelectItem key="uuid" value="uuid">UUID</SelectItem>
            </Select>
          </div>

          {/* 类型特定设置 */}
          {selectedType === "integer" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="最小值"
                placeholder="例如: 1"
                type="number"
                value={minInt}
                onValueChange={setMinInt}
              />
              <Input
                label="最大值"
                placeholder="例如: 100"
                type="number"
                value={maxInt}
                onValueChange={setMaxInt}
              />
            </div>
          )}

          {selectedType === "float" && (
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="最小值"
                placeholder="例如: 0"
                type="number"
                step="0.1"
                value={minFloat}
                onValueChange={setMinFloat}
              />
              <Input
                label="最大值"
                placeholder="例如: 1"
                type="number"
                step="0.1"
                value={maxFloat}
                onValueChange={setMaxFloat}
              />
              <Input
                label="小数位数"
                placeholder="例如: 2"
                type="number"
                min="0"
                max="10"
                value={decimalPlaces}
                onValueChange={setDecimalPlaces}
              />
            </div>
          )}

          {selectedType === "string" && (
            <div className="space-y-4">
              <Input
                label="字符串长度"
                placeholder="例如: 10"
                type="number"
                min="1"
                max="100"
                value={stringLength}
                onValueChange={setStringLength}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="uppercase"
                    checked={includeUppercase}
                    onChange={(e) => setIncludeUppercase(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="uppercase" className="text-sm">包含大写字母</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="lowercase"
                    checked={includeLowercase}
                    onChange={(e) => setIncludeLowercase(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="lowercase" className="text-sm">包含小写字母</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="numbers"
                    checked={includeNumbers}
                    onChange={(e) => setIncludeNumbers(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="numbers" className="text-sm">包含数字</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="symbols"
                    checked={includeSymbols}
                    onChange={(e) => setIncludeSymbols(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="symbols" className="text-sm">包含特殊符号</label>
                </div>
              </div>
            </div>
          )}

          {/* 生成控制 */}
          <div className="flex gap-4 items-end">
            <Input
              className="w-32"
              label="生成数量"
              placeholder="例如: 5"
              type="number"
              min="1"
              max="100"
              value={count}
              onValueChange={setCount}
            />
            <Button color="primary" onClick={generateRandomValues}>
              生成随机数
            </Button>
            {results.length > 0 && (
              <Button color="danger" variant="flat" onClick={clearResults}>
                清空结果
              </Button>
            )}
          </div>

          {/* 结果展示 */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">生成结果 ({results.length}个)</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-default-500 bg-default-200 px-2 py-1 rounded">
                        {getTypeLabel(result.type)}
                      </span>
                      <code className="font-mono text-sm">
                        {typeof result.value === 'boolean' ? result.value.toString() : result.value}
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="flat"
                      onClick={() => copyToClipboard(result.value.toString())}
                    >
                      复制
                    </Button>
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