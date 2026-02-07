import { NextRequest, NextResponse } from "next/server";
import {
  sql,
  ensureTables,
  DEFAULT_EXPIRY_DAYS,
  MAX_MD_SHARE_BYTES,
  utf8ByteLength,
} from "@/lib/db";
import { generateShareId } from "@/lib/id";

function getExpiresAt(days: number = DEFAULT_EXPIRY_DAYS): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables();

    const body = await request.json();
    const content =
      typeof body.content === "string" ? body.content : undefined;
    const expiresInDays =
      typeof body.expiresInDays === "number" && body.expiresInDays > 0
        ? body.expiresInDays
        : DEFAULT_EXPIRY_DAYS;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }

    if (utf8ByteLength(content) > MAX_MD_SHARE_BYTES) {
      return NextResponse.json(
        { error: `内容不能超过 ${MAX_MD_SHARE_BYTES.toLocaleString()} 字节` },
        { status: 400 },
      );
    }

    const id = generateShareId();
    const expiresAt = getExpiresAt(expiresInDays);

    await sql`
      INSERT INTO md_shares (id, content, expires_at)
      VALUES (${id}, ${content}, ${expiresAt.toISOString()})
    `;

    const shareUrl = `${request.nextUrl.origin}/markdown-preview?share=${id}`;

    return NextResponse.json({
      id,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("创建分享失败:", error);
    return NextResponse.json({ error: "创建分享失败" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTables();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少分享ID" }, { status: 400 });
    }

    const rows = await sql`
      SELECT content, expires_at
      FROM md_shares
      WHERE id = ${id} AND expires_at > NOW()
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json(
        { error: "分享不存在或已过期" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      content: row.content,
      expiresAt: (row.expires_at as Date).toISOString(),
    });
  } catch (error) {
    console.error("获取分享失败:", error);
    return NextResponse.json({ error: "获取分享失败" }, { status: 500 });
  }
}
