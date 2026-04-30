import { Hono } from 'hono'
import { createDb } from '../db'
import { questionnaires, questionnaireTemplates, tradeRecords, positions } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'

type Bindings  = { DATABASE_URL: string; JWT_SECRET: string; ASSETS: Fetcher }
type Variables = { userId: string; userRole: 'ADMIN' | 'USER'; username: string }

export const questionnairesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>()

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

// GET /api/questionnaires?tradeId=xxx
questionnairesRouter.get('/', async (c) => {
  const db      = createDb(c.env.DATABASE_URL)
  const userId  = c.get('userId')
  const tradeId = c.req.query('tradeId')

  if (tradeId) {
    // Verify ownership via trade -> position -> user
    const [row] = await db
      .select({ q: questionnaires })
      .from(questionnaires)
      .innerJoin(tradeRecords, eq(questionnaires.tradeId, tradeRecords.id))
      .innerJoin(positions,    eq(tradeRecords.positionId, positions.id))
      .where(and(eq(questionnaires.tradeId, tradeId), eq(positions.userId, userId)))
      .limit(1)
    return c.json(row?.q ?? null)
  }

  // All questionnaires for this user
  const rows = await db
    .select({ q: questionnaires })
    .from(questionnaires)
    .innerJoin(tradeRecords, eq(questionnaires.tradeId, tradeRecords.id))
    .innerJoin(positions,    eq(tradeRecords.positionId, positions.id))
    .where(eq(positions.userId, userId))
    .orderBy(desc(questionnaires.completedAt))
  return c.json(rows.map(r => r.q))
})

// POST /api/questionnaires
questionnairesRouter.post('/', async (c) => {
  const db     = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const body   = await c.req.json()

  // Verify the trade belongs to this user
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

  const grade = scoreToGrade(body.totalScore)
  const [created] = await db
    .insert(questionnaires)
    .values({
      tradeId:     body.tradeId,
      direction:   body.direction,
      answers:     JSON.stringify(body.answers),
      totalScore:  body.totalScore,
      grade,
      completedAt: new Date(),
    })
    .returning()

  return c.json(created, 201)
})

function scoreToGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'D'
}
