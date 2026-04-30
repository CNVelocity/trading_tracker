import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Env } from './types'
import { verifyToken, issueToken, checkRateLimit } from './auth'
import { getDb } from './db/index'
import positionsRouter from './routes/positions'
import tradesRouter from './routes/trades'
import questionnairesRouter from './routes/questionnaires'
import watchlistRouter from './routes/watchlist'

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use('/api/*', cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type'] }))

// ── Auth middleware (attach db + verify token) ─────────────────
const authMiddleware = async (c: any, next: any) => {
  const auth = c.req.header('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const secret = c.env.TOKEN_SECRET ?? c.env.API_SECRET_TOKEN
  if (!token || !(await verifyToken(token, secret))) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.set('db', getDb(c.env.DATABASE_URL))
  await next()
}

// ── Login ──────────────────────────────────────────────────────
app.post('/api/auth/login', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { allowed, retryAfter } = checkRateLimit(ip)
  if (!allowed) {
    return c.json({ error: `Too many attempts. Retry after ${retryAfter}s` }, 429)
  }
  const { password } = await c.req.json<{ password: string }>()
  if (password !== c.env.API_SECRET_TOKEN) {
    return c.json({ error: '密码错误' }, 401)
  }
  const secret = c.env.TOKEN_SECRET ?? c.env.API_SECRET_TOKEN
  const token = await issueToken(secret)
  return c.json({ token })
})

// ── Protected routes ───────────────────────────────────────────
app.use('/api/positions/*', authMiddleware)
app.use('/api/trades/*', authMiddleware)
app.use('/api/questionnaires/*', authMiddleware)
app.use('/api/watchlist/*', authMiddleware)
app.use('/api/templates/*', authMiddleware)

app.route('/api/positions', positionsRouter)
app.route('/api/trades', tradesRouter)
app.route('/api/questionnaires', questionnairesRouter)
app.route('/api/watchlist', watchlistRouter)

// ── Dashboard stats ────────────────────────────────────────────
app.get('/api/stats', authMiddleware, async (c) => {
  const db = c.get('db') as ReturnType<typeof getDb>
  const { positions, questionnaires } = await import('./db/schema')
  const { sql, eq } = await import('drizzle-orm')

  const [openPos] = await db
    .select({ count: sql<number>`count(*)` })
    .from(positions)
    .where(eq(positions.status, 'OPEN'))

  const [scoreAvg] = await db
    .select({ avg: sql<number>`avg(total_score)` })
    .from(questionnaires)

  return c.json({
    openPositionsCount: Number(openPos?.count ?? 0),
    avgDecisionScore: scoreAvg?.avg ? Math.round(Number(scoreAvg.avg)) : null,
  })
})

// ── Questionnaire templates ────────────────────────────────────
app.get('/api/templates', authMiddleware, async (c) => {
  const db = c.get('db') as ReturnType<typeof getDb>
  const { questionnaireTemplates } = await import('./db/schema')
  const { eq, asc } = await import('drizzle-orm')
  const direction = c.req.query('direction') as 'BUY' | 'SELL' | undefined
  const query = db
    .select()
    .from(questionnaireTemplates)
    .orderBy(asc(questionnaireTemplates.orderIndex))
  const templates = direction
    ? await query.where(eq(questionnaireTemplates.direction, direction))
    : await query
  return c.json(templates)
})

// ── SPA fallback ───────────────────────────────────────────────
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
