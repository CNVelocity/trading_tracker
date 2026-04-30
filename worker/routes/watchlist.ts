import { Hono } from 'hono'
import { createDb } from '../db'
import { watchlist } from '../db/schema'
import { eq, isNull, desc, asc, and } from 'drizzle-orm'

type Bindings  = { DATABASE_URL: string; JWT_SECRET: string; ASSETS: Fetcher }
type Variables = { userId: string; userRole: 'ADMIN' | 'USER'; username: string }

export const watchlistRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>()

watchlistRouter.get('/', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')

  const rows = await db
    .select()
    .from(watchlist)
    .where(and(eq(watchlist.userId, userId), isNull(watchlist.removedAt)))
    .orderBy(asc(watchlist.priority), desc(watchlist.createdAt))
  return c.json(rows)
})

watchlistRouter.post('/', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const body   = await c.req.json()

  const [created] = await db
    .insert(watchlist)
    .values({
      userId,
      ticker:         body.ticker,
      name:           body.name           ?? null,
      market:         body.market,
      targetBuyPrice: body.targetBuyPrice ?? null,
      reason:         body.reason         ?? null,
      priority:       body.priority       ?? 'MED',
      notes:          body.notes          ?? null,
      addedAt:        body.addedAt        ?? new Date().toISOString().split('T')[0],
    })
    .returning()

  return c.json(created, 201)
})

watchlistRouter.patch('/:id', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const id     = c.req.param('id')
  const body   = await c.req.json()

  const [existing] = await db.select({ id: watchlist.id })
    .from(watchlist)
    .where(and(eq(watchlist.id, id), eq(watchlist.userId, userId)))
    .limit(1)
  if (!existing) return c.json({ error: 'Not found' }, 404)

  delete body.userId
  const [updated] = await db
    .update(watchlist)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(watchlist.id, id))
    .returning()

  return c.json(updated)
})

watchlistRouter.delete('/:id', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const [existing] = await db.select({ id: watchlist.id })
    .from(watchlist)
    .where(and(eq(watchlist.id, id), eq(watchlist.userId, userId)))
    .limit(1)
  if (!existing) return c.json({ error: 'Not found' }, 404)

  // Soft delete
  await db.update(watchlist)
    .set({ removedAt: new Date().toISOString().split('T')[0], updatedAt: new Date() })
    .where(eq(watchlist.id, id))
  return c.json({ ok: true })
})
