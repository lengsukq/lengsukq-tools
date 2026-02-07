/**
 * Generate a short URL-safe random string for short link codes.
 */
export function generateShortCode(length = 8): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
}

/**
 * Generate a random id for markdown share (longer, URL-safe).
 */
export function generateShareId(): string {
  return generateShortCode(12);
}
