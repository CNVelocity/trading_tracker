import { Hono } from 'hono'
import { createDb } from '../db'
import { questionnaires, questionnaireTemplates, tradeRecords, positions } from '../db/schema'
import { eq, desc, and, or, isNull } from 'drizzle-orm'

type Bindings  = { DATABASE_URL: string; JWT_SECRET: string; ASSETS: Fetcher }
type Variables = { userId: string; userRole: 'ADMIN' | 'USER'; username: string }

export const questionnairesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function scoreToGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'D'
}

// GET /api/questionnaires/templates?direction=BUY|SELL
questionnairesRouter.get('/templates', async (c) => {
  const db        = createDb(c.env.DATABASE_URL)
  const direction = c.req.query('direction') as 'BUY' | 'SELL' | undefined

  const rows = direction
    ? await db.select().from(questionnaireTemplates)
        .where(eq(questionnaireTemplates.direction, direction))
        .orderBy(questionnaireTemplates.orderIndex)
    : await db.select().from(questionnaireTemplates)
        .orderBy(questionnaireTemplates.orderIndex)

  return c.json(rows.filter(t => t.isActive))
})

// GET /api/questionnaires?tradeId=xxx  — or all for user (incl. pre-trade)
questionnairesRouter.get('/', async (c) => {
  const db      = createDb(c.env.DATABASE_URL)
  const userId  = c.get('userId')
  const tradeId = c.req.query('tradeId')

  if (tradeId) {
    const [row] = await db
      .select({ q: questionnaires })
      .from(questionnaires)
      .innerJoin(tradeRecords, eq(questionnaires.tradeId, tradeRecords.id))
      .innerJoin(positions,    eq(tradeRecords.positionId, positions.id))
      .where(and(eq(questionnaires.tradeId, tradeId), eq(positions.userId, userId)))
      .limit(1)
    return c.json(row?.q ?? null)
  }

  // All questionnaires for this user (both linked and pre-trade)
  const rows = await db
    .select()
    .from(questionnaires)
    .where(eq(questionnaires.userId, userId))
    .orderBy(desc(questionnaires.completedAt))
  return c.json(rows)
})

// POST /api/questionnaires
// Supports two modes:
//   1. Post-trade:  body includes tradeId  → links to trade
//   2. Pre-trade:   body has no tradeId    → isPreTrade=true, saved with userId+ticker
questionnairesRouter.post('/', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const body   = await c.req.json()

  const grade = scoreToGrade(body.totalScore)

  // ── Pre-trade mode ──────────────────────────────────────────────────────────
  if (!body.tradeId) {
    const [created] = await db
      .insert(questionnaires)
      .values({
        tradeId:     null,
        userId,
        ticker:      body.ticker?.toUpperCase().trim() ?? null,
        isPreTrade:  true,
        direction:   body.direction,
        answers:     JSON.stringify(body.answers),
        totalScore:  body.totalScore,
        grade,
        completedAt: new Date(),
      })
      .returning()
    return c.json(created, 201)
  }

  // ── Post-trade mode ─────────────────────────────────────────────────────────
  const [trade] = await db
    .select({ positionId: tradeRecords.positionId })
    .from(tradeRecords)
    .where(eq(tradeRecords.id, body.tradeId))
    .limit(1)
  if (!trade) return c.json({ error: 'Trade not found' }, 404)

  const [pos] = await db
    .select({ id: positions.id })
    .from(positions)
    .where(and(eq(positions.id, trade.positionId), eq(positions.userId, userId)))
    .limit(1)
  if (!pos) return c.json({ error: 'Trade not found' }, 404)

  const [created] = await db
    .insert(questionnaires)
    .values({
      tradeId:     body.tradeId,
      userId,
      ticker:      body.ticker ?? null,
      isPreTrade:  false,
      direction:   body.direction,
      answers:     JSON.stringify(body.answers),
      totalScore:  body.totalScore,
      grade,
      completedAt: new Date(),
    })
    .returning()

  return c.json(created, 201)
})

// PATCH /api/questionnaires/:id/link-trade
// Called by trades route (internally) after creating a trade from a pre-check.
// Also callable from client if needed.
questionnairesRouter.patch('/:id/link-trade', async (c) => {
  const db      = createDb(c.env.DATABASE_URL)
  const userId  = c.get('userId')
  const id      = c.req.param('id')
  const body    = await c.req.json() as { tradeId: string }

  // Verify questionnaire belongs to user
  const [existing] = await db
    .select()
    .from(questionnaires)
    .where(and(eq(questionnaires.id, id), eq(questionnaires.userId, userId)))
    .limit(1)
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (existing.tradeId) return c.json({ error: 'Already linked to a trade' }, 409)

  // Verify trade belongs to user
  const [tradeRow] = await db
    .select({ posId: tradeRecords.positionId })
    .from(tradeRecords)
    .where(eq(tradeRecords.id, body.tradeId))
    .limit(1)
  if (!tradeRow) return c.json({ error: 'Trade not found' }, 404)

  const [posRow] = await db
    .select({ id: positions.id })
    .from(positions)
    .where(and(eq(positions.id, tradeRow.posId), eq(positions.userId, userId)))
    .limit(1)
  if (!posRow) return c.json({ error: 'Trade not found' }, 404)

  const [updated] = await db
    .update(questionnaires)
    .set({ tradeId: body.tradeId, isPreTrade: false })
    .where(eq(questionnaires.id, id))
    .returning()

  return c.json(updated)
})
