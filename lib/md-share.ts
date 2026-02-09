import { sql, ensureTables, DEFAULT_EXPIRY_DAYS } from "@/lib/db";
import { generateShareId } from "@/lib/id";

export const MD_SHARE_CODE_MIN_LENGTH = 2;
export const MD_SHARE_CODE_MAX_LENGTH = 32;
export const MD_SHARE_CODE_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function validateCustomCode(
  code: string,
): { valid: true } | { valid: false; error: string } {
  const trimmed = code.trim();
  if (trimmed.length < MD_SHARE_CODE_MIN_LENGTH) {
    return {
      valid: false,
      error: `分享代码至少 ${MD_SHARE_CODE_MIN_LENGTH} 个字符`,
    };
  }
  if (trimmed.length > MD_SHARE_CODE_MAX_LENGTH) {
    return {
      valid: false,
      error: `分享代码最多 ${MD_SHARE_CODE_MAX_LENGTH} 个字符`,
    };
  }
  if (!MD_SHARE_CODE_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: "仅支持字母、数字、下划线和连字符",
    };
  }
  return { valid: true };
}

export async function createMdShare(
  content: string,
  expiresInDays: number = DEFAULT_EXPIRY_DAYS,
  customCode?: string,
): Promise<{ id: string; expiresAt: Date }> {
  await ensureTables();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  if (customCode !== undefined && customCode !== "") {
    const validation = validateCustomCode(customCode);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    const id = customCode.trim();
    try {
      await sql`
        INSERT INTO md_shares (id, content, expires_at)
        VALUES (${id}, ${content}, ${expiresAt.toISOString()})
      `;
      return { id, expiresAt };
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === "23505") {
        throw new Error("该分享代码已被使用，请换一个");
      }
      throw e;
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const id = generateShareId();
    try {
      await sql`
        INSERT INTO md_shares (id, content, expires_at)
        VALUES (${id}, ${content}, ${expiresAt.toISOString()})
      `;
      return { id, expiresAt };
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === "23505") continue;
      throw e;
    }
  }
  throw new Error("生成唯一分享代码失败，请重试");
}

export async function getMdShareContent(
  id: string,
): Promise<{ content: string; expiresAt: Date } | null> {
  await ensureTables();

  const rows = await sql`
    SELECT content, expires_at
    FROM md_shares
    WHERE id = ${id} AND expires_at > NOW()
  `;
  const row = rows[0];
  return row
    ? {
        content: row.content as string,
        expiresAt: row.expires_at as Date,
      }
    : null;
}