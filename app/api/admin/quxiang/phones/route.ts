import { NextRequest, NextResponse } from "next/server";

import { sql, ensureTables } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

type PhoneRow = {
  id: number;
  phone: string;
  label: string | null;
  created_at: string;
};

type SaveRequestBody = {
  phones: { phone: string; label?: string | null }[];
};

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 确保表已创建（兼容首次使用或未跑过 ensureTables 的场景）
  await ensureTables();

  const result = await (sql as any).query(
    `
    SELECT id, phone, label, created_at
    FROM quxiang_phones
    ORDER BY created_at ASC, id ASC
  `,
  );
  const rows = (result?.rows ?? result) as PhoneRow[];

  const items = rows.map((row: PhoneRow) => ({
    id: row.id,
    phone: row.phone,
    label: row.label,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | SaveRequestBody
    | null;

  if (!body || !Array.isArray(body.phones)) {
    return NextResponse.json(
      { error: "phones 不能为空" },
      { status: 400 },
    );
  }

  const normalized = body.phones
    .map((item) => ({
      phone: (item.phone ?? "").trim(),
      label: item.label?.trim() || null,
    }))
    .filter((item) => item.phone.length > 0);

  // 用一个事务整体替换当前手机号配置列表
  await ensureTables();
  await sql`BEGIN`;
  try {
    await sql`TRUNCATE TABLE quxiang_phones`;

    if (normalized.length > 0) {
      for (const item of normalized) {
        // eslint-disable-next-line no-await-in-loop
        await sql`
          INSERT INTO quxiang_phones (phone, label)
          VALUES (${item.phone}, ${item.label})
          ON CONFLICT (phone) DO UPDATE SET label = EXCLUDED.label
        `;
      }
    }

    await sql`COMMIT`;
  } catch (error) {
    await sql`ROLLBACK`;
    // eslint-disable-next-line no-console
    console.error("保存手机号列表失败:", error);
    return NextResponse.json(
      { error: "保存手机号列表失败" },
      { status: 500 },
    );
  }

  const result = await (sql as any).query(
    `
    SELECT id, phone, label, created_at
    FROM quxiang_phones
    ORDER BY created_at ASC, id ASC
  `,
  );

  const rows = (result?.rows ?? result) as PhoneRow[];

  const items = rows.map((row: PhoneRow) => ({
    id: row.id,
    phone: row.phone,
    label: row.label,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ items });
}

