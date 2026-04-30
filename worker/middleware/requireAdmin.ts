import { createMiddleware } from 'hono/factory'

type Variables = { userRole: 'ADMIN' | 'USER' }

export const requireAdmin = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  if (c.get('userRole') !== 'ADMIN') {
    return c.json({ error: 'Forbidden: admin only' }, 403)
  }
  await next()
})
