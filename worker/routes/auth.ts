import { Hono } from 'hono'
import { createDb } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword, hashPassword } from '../lib/password'
import { signToken } from '../lib/jwt'
import { checkRateLimit } from '../auth'

type Bindings  = { DATABASE_URL: string; JWT_SECRET: string; ASSETS: Fetcher }
type Variables = { userId: string; userRole: 'ADMIN' | 'USER'; username: string }
type AppEnv    = { Bindings: Bindings; Variables: Variables }

const COOKIE_TTL = 7 * 24 * 3600

function setTokenCookie(headers: Headers, token: string) {
  headers.set(
    'Set-Cookie',
    `tt_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_TTL}`,
  )
}

// ─── Public routes (no auth required) ────────────────────────────────────────
export const publicAuthRouter = new Hono<AppEnv>()

publicAuthRouter.post('/login', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const limit = checkRateLimit(ip)
  if (!limit.allowed) {
    return c.json({ error: `请求过于频繁，请 ${limit.retryAfter} 秒后重试` }, 429)
  }

  const body = await c.req.json<{ username?: string; password?: string }>()
  const { username, password } = body
  if (!username || !password) return c.json({ error: '用户名和密码不能为空' }, 400)

  const db = createDb(c.env.DATABASE_URL)
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase().trim()))
    .limit(1)

  // Constant-time check even when user doesn't exist
  const dummyHash = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
  const dummySalt = 'AAAAAAAAAAAAAAAAAAA='
  const valid = user
    ? await verifyPassword(password, user.passwordHash, user.passwordSalt)
    : await verifyPassword(password, dummyHash, dummySalt).then(() => false)

  if (!valid || !user?.isActive) {
    return c.json({ error: '用户名或密码错误' }, 401)
  }

  // Update lastLoginAt in background
  db.update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))
    .execute()
    .catch(() => {})

  const token = await signToken(
    { sub: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET,
  )

  const res = c.json({
    token,
    user: {
      id:          user.id,
      username:    user.username,
      displayName: user.displayName,
      role:        user.role,
    },
  })
  setTokenCookie((await res).headers, token)
  return res
})

publicAuthRouter.post('/logout', (c) => {
  const res = c.json({ ok: true })
  res.then(r =>
    r.headers.set('Set-Cookie', 'tt_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'),
  )
  return res
})

// ─── Protected routes (require authMiddleware) ────────────────────────────────
export const authRouter = new Hono<AppEnv>()

authRouter.get('/me', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const [user] = await db
    .select({
      id:          users.id,
      username:    users.username,
      displayName: users.displayName,
      role:        users.role,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, c.get('userId')))
    .limit(1)
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json(user)
})

authRouter.put('/password', async (c) => {
  const { currentPassword, newPassword } =
    await c.req.json<{ currentPassword: string; newPassword: string }>()

  if (!currentPassword || !newPassword) return c.json({ error: '参数缺失' }, 400)
  if (newPassword.length < 8) return c.json({ error: '新密码至少 8 位' }, 400)

  const db = createDb(c.env.DATABASE_URL)
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, c.get('userId')))
    .limit(1)
  if (!user) return c.json({ error: 'Not found' }, 404)

  const valid = await verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)
  if (!valid) return c.json({ error: '当前密码错误' }, 401)

  const { hash, salt } = await hashPassword(newPassword)
  await db
    .update(users)
    .set({ passwordHash: hash, passwordSalt: salt, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  return c.json({ ok: true })
})
