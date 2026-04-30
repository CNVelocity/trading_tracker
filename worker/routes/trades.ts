import { Hono } from 'hono'
import { createDb } from '../db'
import { tradeRecords, positions } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import type { DB } from '../db'

type Bindings = { DATABASE_URL: string; API_SECRET_TOKEN: string; ASSETS: Fetcher }

export const tradesRouter = new Hono<{ Bindings: Bindings }>()

tradesRouter.get('/', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const positionId = c.req.query('positionId')

  const rows = positionId
    ? await db.select().from(tradeRecords).where(eq(tradeRecords.positionId, positionId)).orderBy(desc(tradeRecords.tradeDate))
    : await db.select().from(tradeRecords).orderBy(desc(tradeRecords.tradeDate))

  return c.json(rows)
})

tradesRouter.post('/', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const body = await c.req.json()

  const price = parseFloat(body.price)
  const quantity = parseInt(body.quantity)
  const commission = parseFloat(body.commission ?? '0')
  const totalAmount =
    body.direction === 'BUY'
      ? price * quantity + commission
      : price * quantity - commission

  const [trade] = await db
    .insert(tradeRecords)
    .values({
      positionId: body.positionId,
      direction: body.direction,
      tradeDate: body.tradeDate,
      price: body.price,
      quantity,
      commission: String(commission),
      currency: body.currency ?? 'CNY',
      totalAmount: totalAmount.toFixed(4),
      notes: body.notes ?? null,
    })
    .returning()

  await recalculatePosition(db, body.positionId)

  return c.json(trade, 201)
})

tradesRouter.delete('/:id', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const id = c.req.param('id')

  const [trade] = await db.select().from(tradeRecords).where(eq(tradeRecords.id, id))
  if (!trade) return c.json({ error: 'Not found' }, 404)

  await db.delete(tradeRecords).where(eq(tradeRecords.id, id))
  await recalculatePosition(db, trade.positionId)

  return c.json({ ok: true })
})

async function recalculatePosition(db: DB, positionId: string) {
  const trades = await db
    .select()
    .from(tradeRecords)
    .where(eq(tradeRecords.positionId, positionId))
    .orderBy(tradeRecords.tradeDate)

  let currentQty = 0
  let totalCost = 0 // tracks cost basis of current holding
  let totalBought = 0 // cumulative cash out
  let realizedPnl = 0

  for (const t of trades) {
    const qty = Number(t.quantity)
    const price = parseFloat(String(t.price))
    const commission = parseFloat(String(t.commission ?? '0'))

    if (t.direction === 'BUY') {
      totalBought += qty * price + commission
      totalCost += qty * price + commission
      currentQty += qty
    } else {
      const avgCost = currentQty > 0 ? totalCost / currentQty : 0
      realizedPnl += qty * (price - commission / qty) - qty * avgCost
      totalCost = Math.max(0, totalCost - qty * avgCost)
      currentQty = Math.max(0, currentQty - qty)
    }
  }

  const avgCost = currentQty > 0 ? totalCost / currentQty : 0
  const isClosed = currentQty <= 0

  await db
    .update(positions)
    .set({
      avgCost: avgCost.toFixed(4),
      currentQuantity: Math.max(0, currentQty),
      totalInvested: totalBought.toFixed(4),
      realizedPnl: realizedPnl.toFixed(4),
      status: isClosed ? 'CLOSED' : 'OPEN',
      closedAt: isClosed ? new Date().toISOString().split('T')[0] : null,
      updatedAt: new Date(),
    })
    .where(eq(positions.id, positionId))
}
