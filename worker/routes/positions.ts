import { Hono } from 'hono'
import { createDb } from '../db'
import { positions, tradeRecords } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'

type Bindings  = { DATABASE_URL: string; JWT_SECRET: string; ASSETS: Fetcher }
type Variables = { userId: string; userRole: 'ADMIN' | 'USER'; username: string }

export const positionsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>()

positionsRouter.get('/', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const status = c.req.query('status') as 'OPEN' | 'CLOSED' | undefined

  const rows = status
    ? await db.select().from(positions)
        .where(and(eq(positions.userId, userId), eq(positions.status, status)))
        .orderBy(desc(positions.createdAt))
    : await db.select().from(positions)
        .where(eq(positions.userId, userId))
        .orderBy(desc(positions.createdAt))

  return c.json(rows)
})

positionsRouter.get('/:id', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const [position] = await db.select().from(positions)
    .where(and(eq(positions.id, id), eq(positions.userId, userId)))
    .limit(1)
  if (!position) return c.json({ error: 'Not found' }, 404)

  const trades = await db
    .select().from(tradeRecords)
    .where(eq(tradeRecords.positionId, id))
    .orderBy(desc(tradeRecords.tradeDate))

  return c.json({ ...position, trades })
})

positionsRouter.post('/', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const body   = await c.req.json()

  const [created] = await db
    .insert(positions)
    .values({
      userId,
      ticker:   body.ticker,
      name:     body.name    ?? null,
      market:   body.market,
      currency: body.currency ?? 'CNY',
      openedAt: body.openedAt ?? new Date().toISOString().split('T')[0],
      tags:     body.tags    ?? null,
      notes:    body.notes   ?? null,
    })
    .returning()

  return c.json(created, 201)
})

positionsRouter.patch('/:id', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const id     = c.req.param('id')
  const body   = await c.req.json()

  const [existing] = await db.select({ id: positions.id })
    .from(positions)
    .where(and(eq(positions.id, id), eq(positions.userId, userId)))
    .limit(1)
  if (!existing) return c.json({ error: 'Not found' }, 404)

  // Prevent overwriting userId via patch
  delete body.userId

  const [updated] = await db
    .update(positions)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(positions.id, id))
    .returning()

  return c.json(updated)
})

positionsRouter.delete('/:id', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const [existing] = await db.select({ id: positions.id })
    .from(positions)
    .where(and(eq(positions.id, id), eq(positions.userId, userId)))
    .limit(1)
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await db.delete(positions).where(eq(positions.id, id))
  return c.json({ ok: true })
})
