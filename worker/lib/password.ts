/**
 * password.ts — PBKDF2-SHA256 password hashing (Web Crypto API)
 * 100,000 iterations — Cloudflare Workers Web Crypto hard limit is 100k.
 * (OWASP recommends 310k for Node/server, but CF Workers caps at 100k)
 */

const ITERATIONS = 100_000
const ENC = new TextEncoder()

export async function hashPassword(
  password: string,
  existingSalt?: string,
): Promise<{ hash: string; salt: string }> {
  const saltBytes = existingSalt
    ? Uint8Array.from(atob(existingSalt), c => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16))

  const keyMaterial = await crypto.subtle.importKey(
    'raw', ENC.encode(password), 'PBKDF2', false, ['deriveBits'],
  )
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return {
    hash: btoa(String.fromCharCode(...new Uint8Array(hashBuffer))),
    salt: btoa(String.fromCharCode(...saltBytes)),
  }
}

/** Timing-safe comparison */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
): Promise<boolean> {
  const { hash } = await hashPassword(password, storedSalt)
  if (hash.length !== storedHash.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i)
  }
  return diff === 0
}
