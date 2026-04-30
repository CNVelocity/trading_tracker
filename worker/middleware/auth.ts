import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../lib/jwt'
import { createDb } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; ASSETS: Fetcher }
type Variables = { userId: string; userRole: 'ADMIN' | 'USER'; username: string }

export const authMiddleware = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  // Support both Cookie and Authorization Bearer header
  const cookieHeader = c.req.header('Cookie') ?? ''
  const cookieToken  = cookieHeader.match(/(?:^|;\s*)tt_token=([^;]+)/)?.[1]
  const bearerToken  = c.req.header('Authorization')?.replace('Bearer ', '').trim()
  const token = cookieToken ?? bearerToken

  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const payload = await verifyToken(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)

  // Verify the account is still active (handles disabled accounts with live tokens)
  const db = createDb(c.env.DATABASE_URL)
  const [user] = await db
    .select({ isActive: users.isActive })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1)

  if (!user?.isActive) return c.json({ error: 'Account disabled' }, 403)

  c.set('userId',   payload.sub)
  c.set('userRole', payload.role)
  c.set('username', payload.username)
  await next()
})
