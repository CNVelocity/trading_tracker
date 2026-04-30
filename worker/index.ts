import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { positionsRouter } from './routes/positions'
import { tradesRouter } from './routes/trades'
import { questionnairesRouter } from './routes/questionnaires'
import { watchlistRouter } from './routes/watchlist'

type Bindings = {
  DATABASE_URL: string
  API_SECRET_TOKEN: string
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use(
  '/api/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
)
app.use('/api/*', authMiddleware)

app.route('/api/positions', positionsRouter)
app.route('/api/trades', tradesRouter)
app.route('/api/questionnaires', questionnairesRouter)
app.route('/api/watchlist', watchlistRouter)

app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }))

// Serve SPA assets for all non-API routes
app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw)
})

export default app
