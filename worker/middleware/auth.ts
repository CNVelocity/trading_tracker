import { createMiddleware } from 'hono/factory'

type Bindings = { API_SECRET_TOKEN: string }

export const authMiddleware = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '').trim()
  const expected = c.env.API_SECRET_TOKEN

  if (!expected || token !== expected) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
})
