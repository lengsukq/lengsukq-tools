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
}
