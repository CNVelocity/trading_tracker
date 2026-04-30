import { Hono } from 'hono'
import { createDb } from '../db'
import { questionnaires, questionnaireTemplates } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

type Bindings = { DATABASE_URL: string; API_SECRET_TOKEN: string; ASSETS: Fetcher }

export const questionnairesRouter = new Hono<{ Bindings: Bindings }>()

questionnairesRouter.get('/templates', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const direction = c.req.query('direction') as 'BUY' | 'SELL' | undefined

  const rows = direction
    ? await db.select().from(questionnaireTemplates)
        .where(eq(questionnaireTemplates.direction, direction))
        .orderBy(questionnaireTemplates.orderIndex)
    : await db.select().from(questionnaireTemplates)
        .orderBy(questionnaireTemplates.orderIndex)

  return c.json(rows.filter((t) => t.isActive))
})

questionnairesRouter.get('/', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const tradeId = c.req.query('tradeId')

  if (tradeId) {
    const [q] = await db.select().from(questionnaires).where(eq(questionnaires.tradeId, tradeId))
    return c.json(q ?? null)
  }

  const rows = await db.select().from(questionnaires).orderBy(desc(questionnaires.completedAt))
  return c.json(rows)
})

questionnairesRouter.post('/', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const body = await c.req.json()

  const grade = scoreToGrade(body.totalScore)

  const [created] = await db
    .insert(questionnaires)
    .values({
      tradeId: body.tradeId,
      direction: body.direction,
      answers: JSON.stringify(body.answers),
      totalScore: body.totalScore,
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
