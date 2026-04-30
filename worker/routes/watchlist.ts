import { Hono } from 'hono'
import { createDb } from '../db'
import { watchlist } from '../db/schema'
import { eq, isNull, desc, asc } from 'drizzle-orm'

type Bindings = { DATABASE_URL: string; API_SECRET_TOKEN: string; ASSETS: Fetcher }

export const watchlistRouter = new Hono<{ Bindings: Bindings }>()

watchlistRouter.get('/', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const rows = await db
    .select()
    .from(watchlist)
    .where(isNull(watchlist.removedAt))
    .orderBy(asc(watchlist.priority), desc(watchlist.createdAt))
  return c.json(rows)
})

watchlistRouter.post('/', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const body = await c.req.json()

  const [created] = await db
    .insert(watchlist)
    .values({
      ticker: body.ticker,
      name: body.name ?? null,
      market: body.market,
      currency: body.currency ?? 'CNY',
      targetBuyPrice: body.targetBuyPrice ?? null,
      reason: body.reason ?? null,
      priority: body.priority ?? 'MEDIUM',
      notes: body.notes ?? null,
    })
    .returning()

  return c.json(created, 201)
})

watchlistRouter.patch('/:id', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const body = await c.req.json()

  const [updated] = await db
    .update(watchlist)
    .set(body)
    .where(eq(watchlist.id, id))
    .returning()

  return c.json(updated)
})

watchlistRouter.delete('/:id', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  // Soft delete
  await db.update(watchlist).set({ removedAt: new Date() }).where(eq(watchlist.id, id))
  return c.json({ ok: true })
})
