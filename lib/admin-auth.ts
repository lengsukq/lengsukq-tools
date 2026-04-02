import crypto from "crypto";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE_NAME = "admin_session";
const ADMIN_TOKEN_PAYLOAD = "admin|v1";

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not set");
  }
  return password;
}

function createSignature(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createAdminSessionToken(): string {
  const secret = getAdminPassword();
  const signature = createSignature(secret, ADMIN_TOKEN_PAYLOAD);
  return `${ADMIN_TOKEN_PAYLOAD}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (payload !== ADMIN_TOKEN_PAYLOAD) return false;

  let secret: string;
  try {
    secret = getAdminPassword();
  } catch {
    // 未配置管理员密码时，一律视为未登录
    return false;
  }
  const expected = createSignature(secret, payload);

  // 使用简单的字符串比较，避免 Buffer 类型兼容问题
  return signature === expected;
}

export function isAdminRequest(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}

export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME;
}

