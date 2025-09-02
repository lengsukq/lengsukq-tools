import { NextRequest, NextResponse } from "next/server";

// 内存存储分享的数据
const shareStore = new Map<
  string,
  {
    content: string;
    createdAt: number;
    expiresAt: number;
  }
>();

// 清理过期数据的函数
function cleanupExpiredData() {
  const now = Date.now();

  Array.from(shareStore.entries()).forEach(([key, value]) => {
    if (value.expiresAt < now) {
      shareStore.delete(key);
    }
  });
}

// 生成随机ID
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// POST /api/markdown-share - 创建新的分享
export async function POST(request: NextRequest) {
  try {
    cleanupExpiredData();

    const { content } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }

    const id = generateId();
    const createdAt = Date.now();
    const expiresAt = createdAt + 10 * 60 * 1000; // 10分钟过期

    shareStore.set(id, {
      content,
      createdAt,
      expiresAt,
    });

    return NextResponse.json({
      id,
      shareUrl: `${request.nextUrl.origin}/markdown-preview?share=${id}`,
    });
  } catch (error) {
    console.error("创建分享失败:", error);

    return NextResponse.json({ error: "创建分享失败" }, { status: 500 });
  }
}

// GET /api/markdown-share?id=xxx - 获取分享内容
export async function GET(request: NextRequest) {
  try {
    cleanupExpiredData();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少分享ID" }, { status: 400 });
    }

    const shareData = shareStore.get(id);

    if (!shareData) {
      return NextResponse.json(
        { error: "分享不存在或已过期" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      content: shareData.content,
      expiresAt: shareData.expiresAt,
    });
  } catch (error) {
    console.error("获取分享失败:", error);

    return NextResponse.json({ error: "获取分享失败" }, { status: 500 });
  }
}
