/**
 * jwt.ts — HS256 JWT helpers using Web Crypto API (no external deps).
 * Compatible with Cloudflare Workers and Bun.
 */

const ENC = new TextEncoder()

export interface JwtPayload {
  sub: string            // userId
  username: string
  role: 'ADMIN' | 'USER'
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s
    .replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(Math.ceil(s.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', ENC.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify'],
  )
}

const HEADER = b64url(ENC.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
const TTL = 7 * 24 * 3600  // 7 days

export async function signToken(payload: JwtPayload, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const body = b64url(ENC.encode(JSON.stringify({ ...payload, iat: now, exp: now + TTL })))
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, ENC.encode(`${HEADER}.${body}`))
  return `${HEADER}.${body}.${b64url(sig)}`
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const key = await importKey(secret)
    const valid = await crypto.subtle.verify(
      'HMAC', key, b64urlDecode(sig), ENC.encode(`${header}.${body}`),
    )
    if (!valid) return null
    const data = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body)),
    ) as JwtPayload & { exp: number }
    if (Math.floor(Date.now() / 1000) >= data.exp) return null
    return { sub: data.sub, username: data.username, role: data.role }
  } catch {
    return null
  }
}
