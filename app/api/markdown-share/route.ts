import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_EXPIRY_DAYS,
  MAX_MD_SHARE_BYTES,
  utf8ByteLength,
} from "@/lib/db";
import { createMdShare, getMdShareContent } from "@/lib/md-share";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content =
      typeof body.content === "string" ? body.content : undefined;
    const expiresInDays =
      typeof body.expiresInDays === "number" && body.expiresInDays > 0
        ? body.expiresInDays
        : DEFAULT_EXPIRY_DAYS;
    const customCode =
      typeof body.code === "string" ? body.code.trim() : undefined;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }

    if (utf8ByteLength(content) > MAX_MD_SHARE_BYTES) {
      return NextResponse.json(
        { error: `内容不能超过 ${MAX_MD_SHARE_BYTES.toLocaleString()} 字节` },
        { status: 400 },
      );
    }

    const { id, expiresAt } = await createMdShare(
      content,
      expiresInDays,
      customCode,
    );
    const shareUrl = `${request.nextUrl.origin}/markdown-preview?share=${id}`;

    return NextResponse.json({
      id,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建分享失败";
    if (
      message.startsWith("该分享") ||
      message.startsWith("分享代码") ||
      message.startsWith("仅支持") ||
      message.startsWith("生成唯一")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("创建分享失败:", error);
    return NextResponse.json({ error: "创建分享失败" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少分享ID" }, { status: 400 });
    }

    const data = await getMdShareContent(id);

    if (!data) {
      return NextResponse.json(
        { error: "分享不存在或已过期" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      content: data.content,
      expiresAt: data.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("获取分享失败:", error);
    return NextResponse.json({ error: "获取分享失败" }, { status: 500 });
  }
}
