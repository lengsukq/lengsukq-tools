"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";

type RandomType =
  | "integer"
  | "float"
  | "string"
  | "boolean"
  | "uuid"
  | "color"
  | "password"
  | "datetime"
  | "ip"
  | "username"
  | "country";
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

  // 颜色设置
  const [colorFormat, setColorFormat] = useState<string>("hex");

  // 密码设置
  const [passwordLength, setPasswordLength] = useState<string>("12");
  const [passwordIncludeUppercase, setPasswordIncludeUppercase] =
    useState<boolean>(true);
  const [passwordIncludeLowercase, setPasswordIncludeLowercase] =
    useState<boolean>(true);
  const [passwordIncludeNumbers, setPasswordIncludeNumbers] =
    useState<boolean>(true);
  const [passwordIncludeSymbols, setPasswordIncludeSymbols] =
    useState<boolean>(true);

  // 日期时间设置
  const [startDate, setStartDate] = useState<string>("2020-01-01");
  const [endDate, setEndDate] = useState<string>("2024-12-31");

  // IP地址设置
  const [ipType, setIpType] = useState<string>("ipv4");

  // 用户名设置
  const [usernameStyle, setUsernameStyle] = useState<string>("random");

  // 国家设置
  const [countryFormat, setCountryFormat] = useState<string>("name");

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
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;

        return v.toString(16);
      },
    );
  };

  const generateRandomColor = () => {
    switch (colorFormat) {
      case "hex":
        return (
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")
        );
      case "rgb":
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);

        return `rgb(${r}, ${g}, ${b})`;
      case "hsl":
        const h = Math.floor(Math.random() * 360);
        const s = Math.floor(Math.random() * 101);
        const l = Math.floor(Math.random() * 101);

        return `hsl(${h}, ${s}%, ${l}%)`;
      default:
        return (
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")
        );
    }
  };

  const generateRandomPassword = () => {
    const length = parseInt(passwordLength) || 12;
    let charset = "";

    if (passwordIncludeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (passwordIncludeLowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (passwordIncludeNumbers) charset += "0123456789";
    if (passwordIncludeSymbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";

    if (charset === "") charset = "abcdefghijklmnopqrstuvwxyz";

    let result = "";

    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return result;
  };

  const generateRandomDateTime = () => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const randomTime = Math.floor(Math.random() * (end - start + 1)) + start;

    return (
      new Date(randomTime).toISOString().split("T")[0] +
      " " +
      new Date(randomTime).toTimeString().split(" ")[0]
    );
  };

  const generateRandomIP = () => {
    if (ipType === "ipv4") {
      return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    } else {
      // IPv6
      const segments = [];

      for (let i = 0; i < 8; i++) {
        segments.push(Math.floor(Math.random() * 65536).toString(16));
      }

      return segments.join(":");
    }
  };

  const generateRandomUsername = () => {
    const adjectives = [
      "cool",
      "smart",
      "happy",
      "lucky",
      "fast",
      "strong",
      "brave",
      "kind",
      "funny",
      "wise",
    ];
    const nouns = [
      "tiger",
      "eagle",
      "lion",
      "wolf",
      "bear",
      "fox",
      "hawk",
      "shark",
      "dragon",
      "phoenix",
    ];
    const numbers = Math.floor(Math.random() * 1000);

    if (usernameStyle === "random") {
      return (
        adjectives[Math.floor(Math.random() * adjectives.length)] +
        nouns[Math.floor(Math.random() * nouns.length)] +
        numbers
      );
    } else {
      // 简单随机字符串
      const length = 8 + Math.floor(Math.random() * 5);
      let result = "";
      const charset = "abcdefghijklmnopqrstuvwxyz0123456789";

      for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
      }

      return result;
    }
  };

  const generateRandomCountry = () => {
    const countries = [
      { name: "中国", code: "CN", continent: "亚洲" },
      { name: "美国", code: "US", continent: "北美洲" },
      { name: "日本", code: "JP", continent: "亚洲" },
      { name: "德国", code: "DE", continent: "欧洲" },
      { name: "法国", code: "FR", continent: "欧洲" },
      { name: "英国", code: "GB", continent: "欧洲" },
      { name: "韩国", code: "KR", continent: "亚洲" },
      { name: "加拿大", code: "CA", continent: "北美洲" },
      { name: "澳大利亚", code: "AU", continent: "大洋洲" },
      { name: "巴西", code: "BR", continent: "南美洲" },
    ];

    const country = countries[Math.floor(Math.random() * countries.length)];

    switch (countryFormat) {
      case "name":
        return country.name;
      case "code":
        return country.code;
      case "continent":
        return country.continent;
      case "full":
        return `${country.name} (${country.code}) - ${country.continent}`;
      default:
        return country.name;
    }
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
        case "color":
          value = generateRandomColor();
          break;
        case "password":
          value = generateRandomPassword();
          break;
        case "datetime":
          value = generateRandomDateTime();
          break;
        case "ip":
          value = generateRandomIP();
          break;
        case "username":
          value = generateRandomUsername();
          break;
        case "country":
          value = generateRandomCountry();
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
      case "integer":
        return "整数";
      case "float":
        return "浮点数";
      case "string":
        return "字符串";
      case "boolean":
        return "布尔值";
      case "uuid":
        return "UUID";
      case "color":
        return "颜色";
      case "password":
        return "密码";
      case "datetime":
        return "日期时间";
      case "ip":
        return "IP地址";
      case "username":
        return "用户名";
      case "country":
        return "国家";
      default:
        return type;
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
            <label className="text-sm font-medium" htmlFor="random-type">
              随机类型
            </label>
            <Select
              id="random-type"
              selectedKeys={[selectedType]}
              onSelectionChange={(keys) =>
                setSelectedType(Array.from(keys)[0] as RandomType)
              }
            >
              <SelectItem key="integer">整数</SelectItem>
              <SelectItem key="float">浮点数</SelectItem>
              <SelectItem key="string">字符串</SelectItem>
              <SelectItem key="boolean">布尔值</SelectItem>
              <SelectItem key="uuid">UUID</SelectItem>
              <SelectItem key="color">颜色</SelectItem>
              <SelectItem key="password">密码</SelectItem>
              <SelectItem key="datetime">日期时间</SelectItem>
              <SelectItem key="ip">IP地址</SelectItem>
              <SelectItem key="username">用户名</SelectItem>
              <SelectItem key="country">国家</SelectItem>
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
                step="0.1"
                type="number"
                value={minFloat}
                onValueChange={setMinFloat}
              />
              <Input
                label="最大值"
                placeholder="例如: 1"
                step="0.1"
                type="number"
                value={maxFloat}
                onValueChange={setMaxFloat}
              />
              <Input
                label="小数位数"
                max="10"
                min="0"
                placeholder="例如: 2"
                type="number"
                value={decimalPlaces}
                onValueChange={setDecimalPlaces}
              />
            </div>
          )}

          {selectedType === "color" && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="color-format">
                颜色格式
              </label>
              <Select
                id="color-format"
                selectedKeys={[colorFormat]}
                onSelectionChange={(keys) =>
                  setColorFormat(Array.from(keys)[0] as string)
                }
              >
                <SelectItem key="hex">HEX (#RRGGBB)</SelectItem>
                <SelectItem key="rgb">RGB (r, g, b)</SelectItem>
                <SelectItem key="hsl">HSL (h, s%, l%)</SelectItem>
              </Select>
            </div>
          )}

          {selectedType === "password" && (
            <div className="space-y-4">
              <Input
                label="密码长度"
                max="50"
                min="4"
                placeholder="例如: 12"
                type="number"
                value={passwordLength}
                onValueChange={setPasswordLength}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password-chars">
                  包含字符类型
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      checked={passwordIncludeUppercase}
                      className="rounded"
                      id="password-uppercase"
                      type="checkbox"
                      onChange={(e) =>
                        setPasswordIncludeUppercase(e.target.checked)
                      }
                    />
                    <label className="text-sm" htmlFor="password-uppercase">
                      大写字母
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      checked={passwordIncludeLowercase}
                      className="rounded"
                      id="password-lowercase"
                      type="checkbox"
                      onChange={(e) =>
                        setPasswordIncludeLowercase(e.target.checked)
                      }
                    />
                    <label className="text-sm" htmlFor="password-lowercase">
                      小写字母
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      checked={passwordIncludeNumbers}
                      className="rounded"
                      id="password-numbers"
                      type="checkbox"
                      onChange={(e) =>
                        setPasswordIncludeNumbers(e.target.checked)
                      }
                    />
                    <label className="text-sm" htmlFor="password-numbers">
                      数字
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      checked={passwordIncludeSymbols}
                      className="rounded"
                      id="password-symbols"
                      type="checkbox"
                      onChange={(e) =>
                        setPasswordIncludeSymbols(e.target.checked)
                      }
                    />
                    <label className="text-sm" htmlFor="password-symbols">
                      特殊符号
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedType === "datetime" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="开始日期"
                type="date"
                value={startDate}
                onValueChange={setStartDate}
              />
              <Input
                label="结束日期"
                type="date"
                value={endDate}
                onValueChange={setEndDate}
              />
            </div>
          )}

          {selectedType === "ip" && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ip-type">
                IP类型
              </label>
              <Select
                id="ip-type"
                selectedKeys={[ipType]}
                onSelectionChange={(keys) =>
                  setIpType(Array.from(keys)[0] as string)
                }
              >
                <SelectItem key="ipv4">IPv4</SelectItem>
                <SelectItem key="ipv6">IPv6</SelectItem>
              </Select>
            </div>
          )}

          {selectedType === "username" && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="username-style">
                用户名风格
              </label>
              <Select
                id="username-style"
                selectedKeys={[usernameStyle]}
                onSelectionChange={(keys) =>
                  setUsernameStyle(Array.from(keys)[0] as string)
                }
              >
                <SelectItem key="random">
                  形容词+名词+数字 (如: cooltiger123)
                </SelectItem>
                <SelectItem key="simple">随机字符串</SelectItem>
              </Select>
            </div>
          )}

          {selectedType === "country" && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="country-format">
                输出格式
              </label>
              <Select
                id="country-format"
                selectedKeys={[countryFormat]}
                onSelectionChange={(keys) =>
                  setCountryFormat(Array.from(keys)[0] as string)
                }
              >
                <SelectItem key="name">国家名称</SelectItem>
                <SelectItem key="code">国家代码</SelectItem>
                <SelectItem key="continent">大洲</SelectItem>
                <SelectItem key="full">完整信息</SelectItem>
              </Select>
            </div>
          )}

          {selectedType === "string" && (
            <div className="space-y-4">
              <Input
                label="字符串长度"
                max="100"
                min="1"
                placeholder="例如: 10"
                type="number"
                value={stringLength}
                onValueChange={setStringLength}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    checked={includeUppercase}
                    className="rounded"
                    id="uppercase"
                    type="checkbox"
                    onChange={(e) => setIncludeUppercase(e.target.checked)}
                  />
                  <label className="text-sm" htmlFor="uppercase">
                    包含大写字母
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    checked={includeLowercase}
                    className="rounded"
                    id="lowercase"
                    type="checkbox"
                    onChange={(e) => setIncludeLowercase(e.target.checked)}
                  />
                  <label className="text-sm" htmlFor="lowercase">
                    包含小写字母
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    checked={includeNumbers}
                    className="rounded"
                    id="numbers"
                    type="checkbox"
                    onChange={(e) => setIncludeNumbers(e.target.checked)}
                  />
                  <label className="text-sm" htmlFor="numbers">
                    包含数字
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    checked={includeSymbols}
                    className="rounded"
                    id="symbols"
                    type="checkbox"
                    onChange={(e) => setIncludeSymbols(e.target.checked)}
                  />
                  <label className="text-sm" htmlFor="symbols">
                    包含特殊符号
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 生成控制 */}
          <div className="flex gap-4 items-end">
            <Input
              className="w-32"
              label="生成数量"
              max="100"
              min="1"
              placeholder="例如: 5"
              type="number"
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
              <h3 className="text-lg font-semibold">
                生成结果 ({results.length}个)
              </h3>
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
                        {typeof result.value === "boolean"
                          ? result.value.toString()
                          : result.value}
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
