import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../db/index'
import { questionnaires } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

const router = new Hono<{ Bindings: Env; Variables: { db: ReturnType<typeof getDb> } }>()

/**
 * Grade calculation:
 * S: 90-100, A: 75-89, B: 60-74, C: 45-59, D: 0-44
 */
function calcGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'D'
}

// GET /api/questionnaires?tradeId=xxx
router.get('/', async (c) => {
  const db = c.get('db')
  const tradeId = c.req.query('tradeId')
  const query = db.select().from(questionnaires).orderBy(desc(questionnaires.completedAt))
  const rows = tradeId
    ? await query.where(eq(questionnaires.tradeId, tradeId))
    : await query
  return c.json(rows)
})

// GET /api/questionnaires/:id
router.get('/:id', async (c) => {
  const db = c.get('db')
  const [q] = await db
    .select()
    .from(questionnaires)
    .where(eq(questionnaires.id, c.req.param('id')))
  if (!q) return c.json({ error: 'Not found' }, 404)
  return c.json(q)
})

// POST /api/questionnaires — submit questionnaire
router.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json<{
    tradeId: string
    direction: 'BUY' | 'SELL'
    answers: Record<string, { score?: number; text?: string; selected?: string }>
    totalScore: number
  }>()

  const grade = calcGrade(body.totalScore)

  const [q] = await db
    .insert(questionnaires)
    .values({
      ...body,
      grade,
      completedAt: new Date(),
    })
    .returning()

  return c.json(q, 201)
})

export default router
