import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../db/index'
import { watchlist } from '../db/schema'
import { eq, isNull, desc } from 'drizzle-orm'

const router = new Hono<{ Bindings: Env; Variables: { db: ReturnType<typeof getDb> } }>()

// GET /api/watchlist — only active (not removed)
router.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db
    .select()
    .from(watchlist)
    .where(isNull(watchlist.removedAt))
    .orderBy(desc(watchlist.createdAt))
  return c.json(rows)
})

// POST /api/watchlist
router.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const [item] = await db.insert(watchlist).values(body).returning()
  return c.json(item, 201)
})

// PUT /api/watchlist/:id
router.put('/:id', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const [item] = await db
    .update(watchlist)
    .set(body)
    .where(eq(watchlist.id, c.req.param('id')))
    .returning()
  if (!item) return c.json({ error: 'Not found' }, 404)
  return c.json(item)
})

// DELETE /api/watchlist/:id — soft delete
router.delete('/:id', async (c) => {
  const db = c.get('db')
  await db
    .update(watchlist)
    .set({ removedAt: new Date() })
    .where(eq(watchlist.id, c.req.param('id')))
  return c.json({ ok: true })
})

export default router
