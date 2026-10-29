// Ghana Card numbers are never stored. A hash of the full number is kept instead, so the same
// card used on two accounts can still be found (Verifications → duplicate check).

/** Keeps these hashes apart from any other SHA-256 of the same digits. */
const PREFIX = 'agrictec:ghana-card:';

/** "gha-123456789-0" and "GHA-123456789-0" hash the same. */
export const normalizeCardNumber = (cardNumber: string) => cardNumber.trim().toUpperCase();

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/** FNV-1a (two 32-bit lanes): only used where Web Crypto is unavailable (insecure origins). */
function fallbackHash(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ code, 0x811c9dc5) >>> 0;
  }
  return `fnv-${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
}

/** The stored fingerprint of a full Ghana Card number (SHA-256, hex). */
export async function hashGhanaCard(cardNumber: string): Promise<string> {
  const text = PREFIX + normalizeCardNumber(cardNumber);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return fallbackHash(text);
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest));
}
