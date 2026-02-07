import { sql, ensureTables, DEFAULT_EXPIRY_DAYS } from "@/lib/db";
import { generateShortCode } from "@/lib/id";

export const SHORT_CODE_MIN_LENGTH = 2;
export const SHORT_CODE_MAX_LENGTH = 32;
export const SHORT_CODE_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function validateCustomCode(
  code: string,
): { valid: true } | { valid: false; error: string } {
  const trimmed = code.trim();
  if (trimmed.length < SHORT_CODE_MIN_LENGTH) {
    return {
      valid: false,
      error: `短链至少 ${SHORT_CODE_MIN_LENGTH} 个字符`,
    };
  }
  if (trimmed.length > SHORT_CODE_MAX_LENGTH) {
    return {
      valid: false,
      error: `短链最多 ${SHORT_CODE_MAX_LENGTH} 个字符`,
    };
  }
  if (!SHORT_CODE_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: "仅支持字母、数字、下划线和连字符",
    };
  }
  return { valid: true };
}

export async function createShortLink(
  url: string,
  expiresInDays: number = DEFAULT_EXPIRY_DAYS,
  customCode?: string,
): Promise<{ code: string; expiresAt: Date }> {
  await ensureTables();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  if (customCode !== undefined && customCode !== "") {
    const validation = validateCustomCode(customCode);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    const code = customCode.trim();
    try {
      await sql`
        INSERT INTO short_links (code, url, expires_at)
        VALUES (${code}, ${url}, ${expiresAt.toISOString()})
      `;
      return { code, expiresAt };
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === "23505") {
        throw new Error("该短链已被使用，请换一个");
      }
      throw e;
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortCode(8);
    try {
      await sql`
        INSERT INTO short_links (code, url, expires_at)
        VALUES (${code}, ${url}, ${expiresAt.toISOString()})
      `;
      return { code, expiresAt };
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === "23505") continue;
      throw e;
    }
  }
  throw new Error("生成唯一短链失败，请重试");
}

export async function getShortLinkUrl(
  code: string,
): Promise<string | null> {
  await ensureTables();

  const rows = await sql`
    SELECT url FROM short_links
    WHERE code = ${code} AND expires_at > NOW()
  `;
  const row = rows[0];
  return row ? (row.url as string) : null;
}
