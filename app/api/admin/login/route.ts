import { NextRequest, NextResponse } from "next/server";

import { createAdminSessionToken, getAdminCookieName } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = body?.password;

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      {
        error:
          "管理员密码未配置，请在环境变量中设置 ADMIN_PASSWORD 后再尝试登录。",
      },
      { status: 500 },
    );
  }

  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "密码不能为空" },
      { status: 400 },
    );
  }

  if (password !== adminPassword) {
    return NextResponse.json(
      { error: "密码错误" },
      { status: 401 },
    );
  }

  const token = createAdminSessionToken();
  const response = NextResponse.json({ ok: true });

  response.cookies.set(getAdminCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 小时
  });

  return response;
}

