import { NextRequest, NextResponse } from "next/server";
import { sql, ensureTables } from "@/lib/db";

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTables();

    await Promise.all([
      sql`DELETE FROM md_shares WHERE expires_at < NOW()`,
      sql`DELETE FROM short_links WHERE expires_at < NOW()`,
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("清理过期数据失败:", error);
    return NextResponse.json(
      { error: "清理失败" },
      { status: 500 },
    );
  }
}
