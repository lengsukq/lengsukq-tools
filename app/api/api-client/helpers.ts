const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HEADERS = new Set(["host", "connection", "content-length"]);

export const DEFAULT_TIMEOUT_MS = 30_000;

type ProxyRequestBody = {
  url?: unknown;
  method?: unknown;
  headers?: Record<string, unknown>;
  body?: unknown;
  timeout?: unknown;
};

export function parseAndValidateUrl(rawUrl: unknown): URL | null {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);

    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

export function buildCleanHeaders(
  rawHeaders: Record<string, unknown> | undefined,
) {
  const cleanHeaders: Record<string, string> = {};

  if (!rawHeaders) {
    return cleanHeaders;
  }

  for (const [key, value] of Object.entries(rawHeaders)) {
    const lowerKey = key.toLowerCase();

    if (!BLOCKED_HEADERS.has(lowerKey) && typeof value === "string" && value) {
      cleanHeaders[key] = value;
    }
  }

  return cleanHeaders;
}

export function buildProxyFetchOptions(body: ProxyRequestBody): RequestInit {
  const method = typeof body.method === "string" ? body.method : "GET";
  const cleanHeaders = buildCleanHeaders(body.headers);
  const fetchOptions: RequestInit = {
    method,
    headers: cleanHeaders,
    redirect: "follow",
  };

  const requestBody = body.body;

  if (requestBody && method !== "GET" && method !== "HEAD") {
    const contentType =
      cleanHeaders["content-type"] ?? cleanHeaders["Content-Type"] ?? "";

    if (contentType.includes("application/json")) {
      fetchOptions.body =
        typeof requestBody === "string"
          ? requestBody
          : JSON.stringify(requestBody);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      fetchOptions.body =
        typeof requestBody === "object"
          ? new URLSearchParams(
              requestBody as Record<string, string>,
            ).toString()
          : String(requestBody);
    } else {
      fetchOptions.body =
        typeof requestBody === "string"
          ? requestBody
          : JSON.stringify(requestBody);
    }
  }

  return fetchOptions;
}

export async function decodeProxyResponse(
  response: Response,
): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  }
  if (contentType.includes("text/")) {
    return response.text();
  }
  if (
    contentType.includes("image/") ||
    contentType.includes("application/octet-stream")
  ) {
    const arrayBuffer = await response.arrayBuffer();

    return {
      type: "binary",
      data: Buffer.from(arrayBuffer).toString("base64"),
      contentType,
    };
  }

  try {
    return await response.text();
  } catch {
    return "[无法读取响应内容]";
  }
}

export function buildResponseHeaders(
  response: Response,
): Record<string, string> {
  const responseHeaders: Record<string, string> = {};

  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return responseHeaders;
}

export function resolveTimeoutMs(rawTimeout: unknown): number {
  if (
    typeof rawTimeout === "number" &&
    Number.isFinite(rawTimeout) &&
    rawTimeout > 0
  ) {
    return rawTimeout;
  }

  return DEFAULT_TIMEOUT_MS;
}
