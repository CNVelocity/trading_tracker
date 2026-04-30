/**
 * auth.ts — stateless HMAC-SHA256 signed token helpers
 * Reused from ve-photo-gallery with minor adaptations.
 */

const ENC = new TextEncoder()

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    ENC.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')
  const bin = atob(padded)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

const HEADER = b64url(ENC.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
const TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

export async function issueToken(secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = b64url(ENC.encode(JSON.stringify({ iat: now, exp: now + TTL_SECONDS })))
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, ENC.encode(`${HEADER}.${payload}`))
  return `${HEADER}.${payload}.${b64url(sig)}`
}

export async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [header, payload, sig] = parts
    const key = await importKey(secret)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlDecode(sig),
      ENC.encode(`${header}.${payload}`),
    )
    if (!valid) return false
    const { exp } = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as { exp: number }
    return Math.floor(Date.now() / 1000) < exp
  } catch {
    return false
  }
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  ip: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }
  if (entry.count >= maxAttempts) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true, retryAfter: 0 }
}
