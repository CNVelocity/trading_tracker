import { Hono } from 'hono'
import { createDb } from '../db'
import { positions, tradeRecords } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

type Bindings = { DATABASE_URL: string; API_SECRET_TOKEN: string; ASSETS: Fetcher }

export const positionsRouter = new Hono<{ Bindings: Bindings }>()

positionsRouter.get('/', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const status = c.req.query('status') as 'OPEN' | 'CLOSED' | undefined

  const rows = status
    ? await db.select().from(positions).where(eq(positions.status, status)).orderBy(desc(positions.createdAt))
    : await db.select().from(positions).orderBy(desc(positions.createdAt))

  return c.json(rows)
})

positionsRouter.get('/:id', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const id = c.req.param('id')

  const [position] = await db.select().from(positions).where(eq(positions.id, id))
  if (!position) return c.json({ error: 'Not found' }, 404)

  const trades = await db
    .select()
    .from(tradeRecords)
    .where(eq(tradeRecords.positionId, id))
    .orderBy(desc(tradeRecords.tradeDate))

  return c.json({ ...position, trades })
})

positionsRouter.post('/', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const body = await c.req.json()

  const [created] = await db
    .insert(positions)
    .values({
      ticker: body.ticker,
      name: body.name ?? null,
      market: body.market,
      currency: body.currency ?? 'CNY',
      openedAt: body.openedAt,
      tags: body.tags ?? null,
      notes: body.notes ?? null,
    })
    .returning()

  return c.json(created, 201)
})

positionsRouter.patch('/:id', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const body = await c.req.json()

  const [updated] = await db
    .update(positions)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(positions.id, id))
    .returning()

  return c.json(updated)
})

positionsRouter.delete('/:id', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  await db.delete(positions).where(eq(positions.id, id))
  return c.json({ ok: true })
})
