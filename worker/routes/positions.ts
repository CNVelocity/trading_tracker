import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../db/index'
import { positions, tradeRecords, questionnaires } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'

const router = new Hono<{ Bindings: Env; Variables: { db: ReturnType<typeof getDb> } }>()

// GET /api/positions — list all (default: OPEN)
router.get('/', async (c) => {
  const db = c.get('db')
  const status = c.req.query('status')
  const query = db.select().from(positions).orderBy(desc(positions.openedAt))
  const rows = status
    ? await query.where(eq(positions.status, status as 'OPEN' | 'CLOSED'))
    : await query
  return c.json(rows)
})

// GET /api/positions/:id — single position with its trades
router.get('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const [pos] = await db.select().from(positions).where(eq(positions.id, id))
  if (!pos) return c.json({ error: 'Not found' }, 404)
  const trades = await db
    .select()
    .from(tradeRecords)
    .where(eq(tradeRecords.positionId, id))
    .orderBy(desc(tradeRecords.tradeDate))
  return c.json({ ...pos, trades })
})

// POST /api/positions — create new position
router.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const [pos] = await db.insert(positions).values(body).returning()
  return c.json(pos, 201)
})

// PUT /api/positions/:id — update (e.g. close position)
router.put('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const body = await c.req.json()
  const [pos] = await db
    .update(positions)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(positions.id, id))
    .returning()
  if (!pos) return c.json({ error: 'Not found' }, 404)
  return c.json(pos)
})

// DELETE /api/positions/:id
router.delete('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  await db.delete(positions).where(eq(positions.id, id))
  return c.json({ ok: true })
})

export default router
