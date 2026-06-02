import { NextRequest, NextResponse } from "next/server";

import {
  buildProxyFetchOptions,
  buildResponseHeaders,
  decodeProxyResponse,
  parseAndValidateUrl,
  resolveTimeoutMs,
} from "./helpers";

/**
 * API 客户端代理路由
 * 用于绕过浏览器的 CORS 限制，通过服务器端发起请求
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json({ error: "请求体不能为空" }, { status: 400 });
    }

    const targetUrl = parseAndValidateUrl(body.url);

    if (!targetUrl) {
      return NextResponse.json(
        { error: "无效 URL 或不支持的协议" },
        { status: 400 },
      );
    }

    const fetchOptions = buildProxyFetchOptions(body);

    const timeoutMs = resolveTimeoutMs(body.timeout);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(targetUrl.toString(), fetchOptions);

      clearTimeout(timeoutId);

      const responseBody = await decodeProxyResponse(response);
      const responseHeaders = buildResponseHeaders(response);

      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        url: response.url,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          { error: `请求超时（${timeoutMs}ms）` },
          { status: 408 },
        );
      }

      throw fetchError;
    }
  } catch (error: unknown) {
    console.error("API 客户端代理错误:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "请求失败，请稍后重试",
      },
      { status: 500 },
    );
  }
}
