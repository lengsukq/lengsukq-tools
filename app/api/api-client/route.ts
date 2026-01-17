import { NextRequest, NextResponse } from "next/server";

/**
 * API 客户端代理路由
 * 用于绕过浏览器的 CORS 限制，通过服务器端发起请求
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method, headers, body: requestBody, timeout } = body;

    // 验证 URL
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL 不能为空" },
        { status: 400 },
      );
    }

    // 验证 URL 格式
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "无效的 URL 格式" },
        { status: 400 },
      );
    }

    // 验证协议（只允许 http 和 https）
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return NextResponse.json(
        { error: "只支持 HTTP 和 HTTPS 协议" },
        { status: 400 },
      );
    }

    // 构建请求选项
    const cleanHeaders: Record<string, string> = {};
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        // 过滤掉可能引起问题的 headers
        const lowerKey = key.toLowerCase();
        if (
          lowerKey !== "host" &&
          lowerKey !== "connection" &&
          lowerKey !== "content-length" &&
          value &&
          typeof value === "string"
        ) {
          cleanHeaders[key] = value;
        }
      });
    }

    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: cleanHeaders,
      redirect: "follow",
    };

    // 添加请求体（如果有）
    if (requestBody && method !== "GET" && method !== "HEAD") {
      // 如果 Content-Type 是 application/json，直接使用 JSON
      const contentType = headers?.["content-type"] || headers?.["Content-Type"];
      if (contentType?.includes("application/json")) {
        try {
          fetchOptions.body = JSON.stringify(requestBody);
        } catch {
          fetchOptions.body = requestBody;
        }
      } else if (contentType?.includes("application/x-www-form-urlencoded")) {
        // Form URL encoded
        if (typeof requestBody === "object") {
          fetchOptions.body = new URLSearchParams(requestBody as Record<string, string>).toString();
        } else {
          fetchOptions.body = requestBody;
        }
      } else {
        // 其他类型直接使用原始 body
        fetchOptions.body = typeof requestBody === "string" ? requestBody : JSON.stringify(requestBody);
      }
    }

    // 设置超时（默认 30 秒）
    const timeoutMs = timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    fetchOptions.signal = controller.signal;

    try {
      // 发起请求
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // 读取响应体
      const contentType = response.headers.get("content-type") || "";
      let responseBody: any;

      if (contentType.includes("application/json")) {
        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }
      } else if (contentType.includes("text/")) {
        responseBody = await response.text();
      } else if (contentType.includes("image/") || contentType.includes("application/octet-stream")) {
        // 对于二进制数据，返回 base64
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        responseBody = {
          type: "binary",
          data: base64,
          contentType,
        };
      } else {
        // 尝试作为文本读取
        try {
          responseBody = await response.text();
        } catch {
          responseBody = "[无法读取响应内容]";
        }
      }

      // 构建响应 headers 对象
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        url: response.url,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          { error: `请求超时（${timeoutMs}ms）` },
          { status: 408 },
        );
      }

      throw fetchError;
    }
  } catch (error: any) {
    console.error("API 客户端代理错误:", error);

    return NextResponse.json(
      {
        error: error.message || "请求失败，请稍后重试",
      },
      { status: 500 },
    );
  }
}
