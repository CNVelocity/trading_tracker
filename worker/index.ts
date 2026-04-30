import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { requireAdmin } from './middleware/requireAdmin'
import { publicAuthRouter, authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { positionsRouter } from './routes/positions'
import { tradesRouter } from './routes/trades'
import { questionnairesRouter } from './routes/questionnaires'
import { watchlistRouter } from './routes/watchlist'
import { setupRouter } from './routes/setup'
import { statsRouter } from './routes/stats'

type Bindings = {
  DATABASE_URL: string
  JWT_SECRET:   string
  SETUP_TOKEN?: string
  ASSETS:       Fetcher
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use('/api/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// ── Public routes (no JWT) ───────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }))
app.route('/api/auth',  publicAuthRouter)
app.route('/api/setup', setupRouter)

// ── Auth middleware — applies to everything registered below ─────────────────
app.use('/api/*', authMiddleware)

// ── Protected routes ─────────────────────────────────────────────────────────
app.route('/api/auth', authRouter)

app.use('/api/users/*', requireAdmin)
app.route('/api/users', usersRouter)

app.route('/api/stats',          statsRouter)
app.route('/api/positions',      positionsRouter)
app.route('/api/trades',         tradesRouter)
app.route('/api/questionnaires', questionnairesRouter)
app.route('/api/watchlist',      watchlistRouter)

// ── SPA fallback ─────────────────────────────────────────────────────────────
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
