import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json({ message: "请输入域名" }, { status: 400 });
    }

    // 简单的域名格式验证
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;

    if (!domainRegex.test(domain)) {
      return NextResponse.json({ message: "无效的域名格式" }, { status: 400 });
    }

    const apiUrl = `https://v2.xxapi.cn/api/whois?domain=${domain}`;
    const response = await fetch(apiUrl, { method: "GET", redirect: "follow" });
    const result = await response.json();

    if (result.code !== 200) {
      return NextResponse.json(
        { message: result.msg || "查询失败" },
        { status: result.code || 500 },
      );
    }
    const isRegistered = result.data["Registration Time"]; // 根据API的返回结果判断是否注册
    const whoisData = result.data; // 直接返回API的data，包含详细信息

    return NextResponse.json({
      domain,
      isRegistered,
      whoisData,
    });
  } catch (error) {
    console.error("WHOIS查询错误:", error);

    return NextResponse.json(
      { message: "查询失败，请稍后重试" },
      { status: 500 },
    );
  }
}
