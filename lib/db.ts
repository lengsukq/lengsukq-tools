import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(DATABASE_URL);

export const DEFAULT_EXPIRY_DAYS = 30;
export const MAX_MD_SHARE_BYTES = 10_000;
export const MAX_SHORT_LINK_URL_BYTES = 1_000;

export function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export async function ensureTables(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS md_shares (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS short_links (
      code TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS quxiang_codes (
      id SERIAL PRIMARY KEY,
      raw_text TEXT NOT NULL,
      code TEXT NOT NULL,
      phone TEXT,
      year_month TEXT,
      source TEXT NOT NULL DEFAULT 'xian_xiangfeixiang',
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE quxiang_codes
    ADD COLUMN IF NOT EXISTS is_sold BOOLEAN NOT NULL DEFAULT false
  `;
  await sql`
    ALTER TABLE quxiang_codes
    ADD COLUMN IF NOT EXISTS sold_price NUMERIC(10, 2)
  `;
  await sql`
    ALTER TABLE quxiang_codes
    ALTER COLUMN phone SET NOT NULL
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS quxiang_codes_code_idx
    ON quxiang_codes (code)
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS quxiang_codes_code_phone_year_month_idx
    ON quxiang_codes (code, COALESCE(phone, ''), COALESCE(year_month, ''))
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS quxiang_phones (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}
