/**
 * users.ts — admin-only user management
 * All routes require authMiddleware + requireAdmin (applied in index.ts)
 */
import { Hono } from 'hono'
import { createDb } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../lib/password'

type Bindings  = { DATABASE_URL: string; JWT_SECRET: string; ASSETS: Fetcher }
type Variables = { userId: string; userRole: 'ADMIN' | 'USER'; username: string }

export const usersRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/users
usersRouter.get('/', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const list = await db
    .select({
      id:          users.id,
      username:    users.username,
      displayName: users.displayName,
      role:        users.role,
      isActive:    users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt:   users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt)
  return c.json(list)
})

// POST /api/users — create user
usersRouter.post('/', async (c) => {
  const { username, displayName, password, role } =
    await c.req.json<{
      username: string
      displayName: string
      password: string
      role?: 'ADMIN' | 'USER'
    }>()

  if (!username || !displayName || !password) return c.json({ error: '参数缺失' }, 400)
  if (password.length < 8) return c.json({ error: '密码至少 8 位' }, 400)

  const { hash, salt } = await hashPassword(password)
  const db = createDb(c.env.DATABASE_URL)

  try {
    const [user] = await db
      .insert(users)
      .values({
        username:     username.toLowerCase().trim(),
        displayName,
        passwordHash: hash,
        passwordSalt: salt,
        role:         role ?? 'USER',
      })
      .returning({
        id:          users.id,
        username:    users.username,
        displayName: users.displayName,
        role:        users.role,
      })
    return c.json(user, 201)
  } catch {
    return c.json({ error: '用户名已存在' }, 409)
  }
})

// PUT /api/users/:id — update user
usersRouter.put('/:id', async (c) => {
  const targetId = c.req.param('id')
  const { displayName, role, isActive, password } =
    await c.req.json<{
      displayName?: string
      role?: 'ADMIN' | 'USER'
      isActive?: boolean
      password?: string
    }>()

  // Prevent admin from disabling their own account
  if (targetId === c.get('userId') && isActive === false) {
    return c.json({ error: '不能停用自己的账号' }, 400)
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (displayName !== undefined) updates.displayName = displayName
  if (role      !== undefined) updates.role      = role
  if (isActive  !== undefined) updates.isActive  = isActive
  if (password) {
    if (password.length < 8) return c.json({ error: '密码至少 8 位' }, 400)
    const { hash, salt } = await hashPassword(password)
    updates.passwordHash = hash
    updates.passwordSalt = salt
  }

  const db = createDb(c.env.DATABASE_URL)
  const [user] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, targetId))
    .returning({ id: users.id, username: users.username, isActive: users.isActive, role: users.role })

  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json(user)
})

// DELETE /api/users/:id — delete user (soft: just deactivate is safer)
usersRouter.delete('/:id', async (c) => {
  const targetId = c.req.param('id')
  if (targetId === c.get('userId')) return c.json({ error: '不能删除自己' }, 400)

  const db = createDb(c.env.DATABASE_URL)
  const [user] = await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, targetId))
    .returning({ id: users.id })

  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})
