import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../db/index'
import { tradeRecords, positions } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'

const router = new Hono<{ Bindings: Env; Variables: { db: ReturnType<typeof getDb> } }>()

// GET /api/trades?positionId=xxx
router.get('/', async (c) => {
  const db = c.get('db')
  const positionId = c.req.query('positionId')
  const query = db.select().from(tradeRecords).orderBy(desc(tradeRecords.tradeDate))
  const rows = positionId
    ? await query.where(eq(tradeRecords.positionId, positionId))
    : await query
  return c.json(rows)
})

// GET /api/trades/:id
router.get('/:id', async (c) => {
  const db = c.get('db')
  const [trade] = await db
    .select()
    .from(tradeRecords)
    .where(eq(tradeRecords.id, c.req.param('id')))
  if (!trade) return c.json({ error: 'Not found' }, 404)
  return c.json(trade)
})

// POST /api/trades — create trade + recalculate position aggregates
router.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json<{
    positionId: string
    direction: 'BUY' | 'SELL'
    tradeDate: string
    price: string
    quantity: number
    commission?: string
    currency?: 'CNY' | 'HKD' | 'USD'
    notes?: string
  }>()

  const price = parseFloat(body.price)
  const qty = body.quantity
  const commission = parseFloat(body.commission ?? '0')
  const totalAmount =
    body.direction === 'BUY'
      ? price * qty + commission
      : price * qty - commission

  const [trade] = await db
    .insert(tradeRecords)
    .values({ ...body, totalAmount: totalAmount.toString() })
    .returning()

  // Recalculate position aggregates
  await recalcPosition(db, body.positionId)

  return c.json(trade, 201)
})

// DELETE /api/trades/:id
router.delete('/:id', async (c) => {
  const db = c.get('db')
  const [trade] = await db
    .select()
    .from(tradeRecords)
    .where(eq(tradeRecords.id, c.req.param('id')))
  if (!trade) return c.json({ error: 'Not found' }, 404)
  await db.delete(tradeRecords).where(eq(tradeRecords.id, trade.id))
  await recalcPosition(db, trade.positionId)
  return c.json({ ok: true })
})

/**
 * Recalculate and persist position aggregates after any trade mutation.
 * - avgCost: weighted average cost of remaining BUY shares
 * - currentQuantity: net shares held
 * - totalInvested: cumulative BUY amount
 * - realizedPnl: sum of (sell proceeds - proportional cost)
 */
async function recalcPosition(db: ReturnType<typeof getDb>, positionId: string) {
  const trades = await db
    .select()
    .from(tradeRecords)
    .where(eq(tradeRecords.positionId, positionId))

  let totalBuyQty = 0
  let totalBuyCost = 0
  let realizedPnl = 0

  const buyQueue: Array<{ price: number; qty: number }> = []

  for (const t of trades.sort((a, b) =>
    new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime(),
  )) {
    const p = parseFloat(String(t.price))
    const q = t.quantity
    const comm = parseFloat(String(t.commission ?? 0))

    if (t.direction === 'BUY') {
      totalBuyQty += q
      totalBuyCost += p * q + comm
      buyQueue.push({ price: p, qty: q })
    } else {
      // FIFO: consume earliest buys first
      let remaining = q
      let costBasis = 0
      while (remaining > 0 && buyQueue.length > 0) {
        const head = buyQueue[0]
        const consumed = Math.min(head.qty, remaining)
        costBasis += consumed * head.price
        head.qty -= consumed
        remaining -= consumed
        if (head.qty === 0) buyQueue.shift()
      }
      const proceeds = p * q - comm
      realizedPnl += proceeds - costBasis
    }
  }

  const currentQuantity = buyQueue.reduce((s, b) => s + b.qty, 0)
  const avgCost =
    currentQuantity > 0
      ? buyQueue.reduce((s, b) => s + b.price * b.qty, 0) / currentQuantity
      : 0

  await db
    .update(positions)
    .set({
      currentQuantity,
      avgCost: avgCost.toFixed(4),
      totalInvested: totalBuyCost.toFixed(4),
      realizedPnl: realizedPnl.toFixed(4),
      status: currentQuantity === 0 ? 'CLOSED' : 'OPEN',
      closedAt: currentQuantity === 0 ? new Date().toISOString().slice(0, 10) : null,
      updatedAt: new Date(),
    })
    .where(eq(positions.id, positionId))
}

export default router
