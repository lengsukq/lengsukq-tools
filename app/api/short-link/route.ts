import { NextRequest, NextResponse } from "next/server";
import { createShortLink } from "@/lib/short-link";
import {
  DEFAULT_EXPIRY_DAYS,
  MAX_SHORT_LINK_URL_BYTES,
  utf8ByteLength,
} from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const expiresInDays =
      typeof body.expiresInDays === "number" && body.expiresInDays > 0
        ? body.expiresInDays
        : DEFAULT_EXPIRY_DAYS;
    const customCode =
      typeof body.code === "string" ? body.code.trim() : undefined;

    if (!url) {
      return NextResponse.json({ error: "URL不能为空" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "URL格式无效" }, { status: 400 });
    }

    if (utf8ByteLength(url) > MAX_SHORT_LINK_URL_BYTES) {
      return NextResponse.json(
        {
          error: `原链接不能超过 ${MAX_SHORT_LINK_URL_BYTES.toLocaleString()} 字节`,
        },
        { status: 400 },
      );
    }

    const { code, expiresAt } = await createShortLink(
      url,
      expiresInDays,
      customCode,
    );
    const shortUrl = `${request.nextUrl.origin}/s/${code}`;

    return NextResponse.json({
      success: true,
      shortUrl,
      code,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成短链接失败";
    if (
      message.startsWith("该短链") ||
      message.startsWith("短链") ||
      message.startsWith("仅支持") ||
      message.startsWith("生成唯一")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("生成短链接失败:", error);
    return NextResponse.json({ error: "生成短链接失败" }, { status: 500 });
  }
}
