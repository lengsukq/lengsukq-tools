"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Input,
  Button,
  Select,
  SelectItem,
  Textarea,
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Chip,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  ScrollShadow,
  Tooltip,
} from "@heroui/react";
import { ApiRequest, ApiResponse, Header, HttpMethod, QueryParam, RequestHistory } from "@/app/api-client/types";
import { HTTP_METHODS, BODY_TYPES, DEFAULT_HEADERS, STORAGE_KEYS } from "@/app/api-client/constants";

export function ApiClient() {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [queryParams, setQueryParams] = useState<QueryParam[]>([]);
  const [headers, setHeaders] = useState<Header[]>(() =>
    DEFAULT_HEADERS.map((h) => ({ ...h, enabled: true })),
  );
  const [body, setBody] = useState("");
  const [bodyType, setBodyType] = useState<"json" | "text" | "form-urlencoded" | "form-data">("json");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure();

  // 从 localStorage 加载历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
      } catch {
        // 忽略解析错误
      }
    }

    // 加载保存的请求
    const saved = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.url) setUrl(parsed.url);
        if (parsed.method) setMethod(parsed.method);
        if (parsed.headers) setHeaders(parsed.headers);
        if (parsed.queryParams) setQueryParams(parsed.queryParams);
        if (parsed.body) setBody(parsed.body);
        if (parsed.bodyType) setBodyType(parsed.bodyType);
      } catch {
        // 忽略解析错误
      }
    }
  }, []);

  // 构建完整的 URL（包含 query parameters）
  const buildFullUrl = useCallback((baseUrl: string, params: QueryParam[]): string => {
    const enabledParams = params.filter((p) => p.enabled && p.key.trim());
    if (enabledParams.length === 0) return baseUrl;

    const urlObj = new URL(baseUrl);
    enabledParams.forEach((param) => {
      urlObj.searchParams.append(param.key.trim(), param.value.trim());
    });
    return urlObj.toString();
  }, []);

  // 保存请求到 localStorage
  const saveRequest = useCallback(() => {
    const request: Partial<ApiRequest> = {
      method,
      url,
      queryParams,
      headers,
      body,
      bodyType,
    };
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(request));
  }, [method, url, queryParams, headers, body, bodyType]);

  // 保存到历史记录
  const saveToHistory = useCallback(
    (response: ApiResponse) => {
      const historyItem: RequestHistory = {
        id: Date.now().toString(),
        name: `${method} ${url}`,
        request: {
          method,
          url,
          queryParams,
          headers,
          body,
          bodyType,
        },
        timestamp: Date.now(),
      };

      const newHistory = [historyItem, ...history].slice(0, 50); // 最多保存 50 条
      setHistory(newHistory);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory));
    },
    [method, url, queryParams, headers, body, bodyType, history],
  );

  // 更新 query param
  const updateQueryParam = useCallback(
    (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
      const newParams = [...queryParams];
      newParams[index] = { ...newParams[index], [field]: value };
      setQueryParams(newParams);
    },
    [queryParams],
  );

  // 添加 query param
  const addQueryParam = useCallback(() => {
    setQueryParams([...queryParams, { key: "", value: "", enabled: true }]);
  }, [queryParams]);

  // 删除 query param
  const removeQueryParam = useCallback(
    (index: number) => {
      setQueryParams(queryParams.filter((_, i) => i !== index));
    },
    [queryParams],
  );

  // 更新 header
  const updateHeader = useCallback(
    (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
      const newHeaders = [...headers];
      newHeaders[index] = { ...newHeaders[index], [field]: value };
      setHeaders(newHeaders);
    },
    [headers],
  );

  // 添加 header
  const addHeader = useCallback(() => {
    setHeaders([...headers, { key: "", value: "", enabled: true }]);
  }, [headers]);

  // 删除 header
  const removeHeader = useCallback(
    (index: number) => {
      setHeaders(headers.filter((_, i) => i !== index));
    },
    [headers],
  );

  // 加载历史请求
  const loadHistoryRequest = useCallback(
    (historyItem: RequestHistory) => {
      setMethod(historyItem.request.method);
      setUrl(historyItem.request.url);
      setQueryParams(historyItem.request.queryParams || []);
      setHeaders(historyItem.request.headers);
      setBody(historyItem.request.body);
      setBodyType(historyItem.request.bodyType);
      onHistoryClose();
    },
    [onHistoryClose],
  );

  // 删除历史记录
  const deleteHistory = useCallback(
    (id: string) => {
      const newHistory = history.filter((h) => h.id !== id);
      setHistory(newHistory);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory));
    },
    [history],
  );

  // 复制响应内容
  const copyResponse = useCallback(async () => {
    if (!response) return;
    try {
      const text = formatResponseBody(response.body);
      await navigator.clipboard.writeText(text);
      // 可以添加 toast 提示
    } catch (err) {
      console.error("复制失败:", err);
    }
  }, [response]);

  // 发送请求
  const sendRequest = useCallback(async () => {
    if (!url.trim()) {
      setError("请输入 URL");
      return;
    }

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      // 构建完整的 URL（包含 query parameters）
      const fullUrl = buildFullUrl(url, queryParams);

      // 构建 headers 对象
      const requestHeaders: Record<string, string> = {};
      headers
        .filter((h) => h.enabled && h.key.trim())
        .forEach((h) => {
          requestHeaders[h.key.trim()] = h.value.trim();
        });

      // 处理 body
      let requestBody: any = null;
      if (body.trim() && method !== "GET" && method !== "HEAD") {
        if (bodyType === "json") {
          try {
            requestBody = JSON.parse(body);
          } catch {
            setError("JSON 格式错误");
            setLoading(false);
            return;
          }
        } else if (bodyType === "form-urlencoded") {
          // 解析 form-urlencoded 格式
          const pairs = body.split("&").map((pair) => pair.split("="));
          requestBody = Object.fromEntries(
            pairs.map(([key, value]) => [
              decodeURIComponent(key || ""),
              decodeURIComponent(value || ""),
            ]),
          );
          requestHeaders["Content-Type"] = "application/x-www-form-urlencoded";
        } else {
          requestBody = body;
        }

        // 设置 Content-Type（如果未设置）
        if (!requestHeaders["Content-Type"] && !requestHeaders["content-type"]) {
          if (bodyType === "json") {
            requestHeaders["Content-Type"] = "application/json";
          } else if (bodyType === "text") {
            requestHeaders["Content-Type"] = "text/plain";
          }
        }
      }

      const startTime = Date.now();

      // 发送请求到代理 API
      const proxyResponse = await fetch("/api/api-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: fullUrl,
          method,
          headers: requestHeaders,
          body: requestBody,
        }),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      const data = await proxyResponse.json();

      if (!proxyResponse.ok) {
        setError(data.error || "请求失败");
        setLoading(false);
        return;
      }

      const responseData: ApiResponse = {
        ...data,
        time: duration,
      };

      setResponse(responseData);

      // 保存请求和历史记录
      saveRequest();
      saveToHistory(responseData);
    } catch (err: any) {
      setError(err.message || "请求失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [url, method, queryParams, headers, body, bodyType, buildFullUrl, saveRequest, saveToHistory]);

  // 格式化响应 body
  const formatResponseBody = useCallback((body: any): string => {
    if (typeof body === "string") {
      return body;
    }
    if (body && typeof body === "object") {
      if (body.type === "binary") {
        return `[二进制数据: ${body.contentType}]`;
      }
      return JSON.stringify(body, null, 2);
    }
    return String(body);
  }, []);

  // 格式化时间
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // 检查是否是 GET 请求
  const isGetRequest = method === "GET" || method === "HEAD";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* 请求配置区域 */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Select
              className="w-32"
              selectedKeys={[method]}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
            >
              {HTTP_METHODS.map((m) => (
                <SelectItem key={m}>
                  {m}
                </SelectItem>
              ))}
            </Select>
            <div className="flex-1">
              <Input
                className="w-full"
                placeholder="https://api.example.com/endpoint"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    sendRequest();
                  }
                }}
              />
              {isGetRequest && queryParams.length > 0 && queryParams.some((p) => p.enabled && p.key.trim()) && (
                <p className="text-xs text-default-400 mt-1 truncate">
                  完整 URL: {buildFullUrl(url, queryParams)}
                </p>
              )}
            </div>
            <Button color="primary" isLoading={loading} onClick={sendRequest}>
              发送
            </Button>
            <Tooltip content={`历史记录 (${history.length})`}>
              <Button variant="light" onClick={onHistoryOpen}>
                历史 {history.length > 0 && `(${history.length})`}
              </Button>
            </Tooltip>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Query Parameters 配置（仅 GET 请求显示） */}
          {isGetRequest && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold">Query Parameters</h3>
                  <p className="text-xs text-default-400 mt-0.5">
                    用于 GET 请求的 URL 查询参数
                  </p>
                </div>
                <Button size="sm" variant="light" onClick={addQueryParam}>
                  添加参数
                </Button>
              </div>
              {queryParams.length === 0 ? (
                <div className="text-sm text-default-400 py-2 border border-dashed border-default-200 rounded-lg px-4">
                  暂无参数，点击"添加参数"添加 URL 查询参数
                </div>
              ) : (
                <div className="space-y-2">
                  {queryParams.map((param, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        className="flex-1"
                        placeholder="参数名"
                        size="sm"
                        value={param.key}
                        onChange={(e) => updateQueryParam(index, "key", e.target.value)}
                        disabled={!param.enabled}
                      />
                      <Input
                        className="flex-1"
                        placeholder="参数值"
                        size="sm"
                        value={param.value}
                        onChange={(e) => updateQueryParam(index, "value", e.target.value)}
                        disabled={!param.enabled}
                      />
                      <Button
                        size="sm"
                        variant={param.enabled ? "solid" : "bordered"}
                        color={param.enabled ? "success" : "default"}
                        isIconOnly
                        onClick={() => updateQueryParam(index, "enabled", !param.enabled)}
                        title={param.enabled ? "禁用" : "启用"}
                      >
                        {param.enabled ? "✓" : "✗"}
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        isIconOnly
                        onClick={() => removeQueryParam(index)}
                        title="删除"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Headers 配置 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold">Headers</h3>
                <p className="text-xs text-default-400 mt-0.5">
                  请求头信息
                </p>
              </div>
              <Button size="sm" variant="light" onClick={addHeader}>
                添加 Header
              </Button>
            </div>
            <div className="space-y-2">
              {headers.map((header, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    className="flex-1"
                    placeholder="Key"
                    size="sm"
                    value={header.key}
                    onChange={(e) => updateHeader(index, "key", e.target.value)}
                    disabled={!header.enabled}
                  />
                  <Input
                    className="flex-1"
                    placeholder="Value"
                    size="sm"
                    value={header.value}
                    onChange={(e) => updateHeader(index, "value", e.target.value)}
                    disabled={!header.enabled}
                  />
                  <Button
                    size="sm"
                    variant={header.enabled ? "solid" : "bordered"}
                    color={header.enabled ? "success" : "default"}
                    isIconOnly
                    onClick={() => updateHeader(index, "enabled", !header.enabled)}
                    title={header.enabled ? "禁用" : "启用"}
                  >
                    {header.enabled ? "✓" : "✗"}
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isIconOnly
                    onClick={() => removeHeader(index)}
                    title="删除"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Body 配置 */}
          {(method === "POST" || method === "PUT" || method === "PATCH") && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold">Body</h3>
                  <p className="text-xs text-default-400 mt-0.5">
                    请求体内容
                  </p>
                </div>
                <Select
                  className="w-48"
                  size="sm"
                  selectedKeys={[bodyType]}
                  onChange={(e) => setBodyType(e.target.value as any)}
                >
                  {BODY_TYPES.map((type) => (
                    <SelectItem key={type.key}>
                      {type.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <Textarea
                placeholder={
                  bodyType === "json"
                    ? '{"key": "value"}'
                    : bodyType === "form-urlencoded"
                      ? "key1=value1&key2=value2"
                      : "Enter request body..."
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
                minRows={8}
                classNames={{
                  input: "font-mono text-sm",
                }}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* 错误显示 */}
      {error && (
        <Card>
          <CardBody>
            <div className="text-danger flex items-center gap-2">
              <span className="font-semibold">错误:</span>
              <span>{error}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 响应显示 */}
      {response && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Chip
                color={response.status >= 200 && response.status < 300 ? "success" : "danger"}
                variant="flat"
                size="lg"
              >
                {response.status} {response.statusText}
              </Chip>
              {response.time && (
                <Chip variant="flat" size="sm">
                  {response.time}ms
                </Chip>
              )}
            </div>
            <Tooltip content="复制响应内容">
              <Button size="sm" variant="light" onClick={copyResponse}>
                复制
              </Button>
            </Tooltip>
          </CardHeader>
          <CardBody>
            <Tabs>
              <Tab key="body" title="Body">
                <div className="mt-4">
                  <Textarea
                    value={formatResponseBody(response.body)}
                    readOnly
                    minRows={15}
                    classNames={{
                      input: "font-mono text-sm",
                    }}
                  />
                </div>
              </Tab>
              <Tab key="headers" title="Headers">
                <div className="mt-4 space-y-2">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-sm">
                      <span className="font-semibold min-w-[200px]">{key}:</span>
                      <span className="text-default-600 break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      )}

      {/* 历史记录模态框 */}
      <Modal isOpen={isHistoryOpen} onClose={onHistoryClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>请求历史</ModalHeader>
          <ModalBody>
            {history.length === 0 ? (
              <div className="text-center text-default-400 py-8">暂无历史记录</div>
            ) : (
              <ScrollShadow className="max-h-[500px]">
                <div className="space-y-2">
                  {history.map((item) => (
                    <Card key={item.id} className="cursor-pointer hover:bg-default-100">
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <div
                            className="flex-1"
                            onClick={() => loadHistoryRequest(item)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Chip size="sm" variant="flat" color="primary">
                                {item.request.method}
                              </Chip>
                              <span className="font-semibold text-sm">{item.name}</span>
                            </div>
                            <div className="text-xs text-default-400">
                              {formatTime(item.timestamp)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            isIconOnly
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHistory(item.id);
                            }}
                            title="删除"
                          >
                            ×
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </ScrollShadow>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onHistoryClose}>
              关闭
            </Button>
            {history.length > 0 && (
              <Button
                color="danger"
                variant="light"
                onPress={() => {
                  setHistory([]);
                  localStorage.removeItem(STORAGE_KEYS.HISTORY);
                }}
              >
                清空历史
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
