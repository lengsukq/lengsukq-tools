import { NextRequest, NextResponse } from "next/server";

// POST /api/short-link - 生成短链接
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL不能为空" }, { status: 400 });
    }

    // 调用外部短链接API
    const shortUrlApi = `https://api.mg-tool.cn/v1/dlj/?url=${encodeURIComponent(url)}`;
    const response = await fetch(shortUrlApi);
    const data = await response.json();

    // 返回外部API的响应
    return NextResponse.json(data);
  } catch (error) {
    console.error("生成短链接失败:", error);

    return NextResponse.json({ error: "生成短链接失败" }, { status: 500 });
  }
}