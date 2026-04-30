# Trading Tracker

> 股票交易记录与决策质量分析系统（多用户版）

帮助多位用户独立记录交易、通过问卷评估决策质量、在个人看板中分析行为模式的全栈 Web 应用。每位用户数据完全隔离，管理员统一管理账号。

---

## 当前构建状态

| 层 | 状态 | 说明 |
|---|---|---|
| 前端（React + Vite） | ✅ 构建通过 | 路由、页面骨架、登录表单、UI 组件均已就绪 |
| Worker 鉴权 | ⚠️ 需重写 | `worker/auth.ts` 和 `worker/middleware/auth.ts` 仍是旧单 Token 逻辑 |
| 数据库 Schema | ⚠️ 需更新 | `worker/db/schema.ts` 缺少 `users` 表，`positions`/`watchlist` 缺少 `user_id` |
| Worker 路由 | ⚠️ 需补充 | 缺少 `auth.ts`、`users.ts` 路由；现有路由尚无用户隔离逻辑 |
| 数据库迁移 | ❌ 未执行 | Schema 变更后需运行 `bun run db:migrate` |

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 18 + TypeScript |
| 样式 | Tailwind CSS v4 |
| 路由 | React Router v6 |
| 动画 | Framer Motion |
| 图标 | Lucide React |
| 图表 | Recharts |
| 构建工具 | Vite |
| 部署平台 | Cloudflare Pages |
| 后端运行时 | Cloudflare Workers（Hono） |
| 数据库 | Neon PostgreSQL（serverless） |
| ORM | Drizzle ORM |
| 鉴权 | JWT（HS256，`jose` 库）+ httpOnly Cookie |
| 密码哈希 | Web Crypto API — PBKDF2-SHA256 |
| 包管理 | Bun |

---

## 项目结构

```
trading_tracker/
├── src/                          # 前端（React）
│   ├── components/
│   │   ├── ui/                   # Button, Card, Input, Modal, Badge, Skeleton, ScoreSlider
│   │   ├── charts/               # Recharts 封装（待实现）
│   │   └── layout/               # Layout, Sidebar, Header
│   ├── pages/
│   │   ├── Login.tsx             # ✅ 用户名+密码登录页
│   │   ├── Dashboard.tsx         # ✅ 骨架（KPI 待接数据）
│   │   ├── Positions.tsx         # ✅ 骨架
│   │   ├── Trades.tsx            # ✅ 骨架
│   │   ├── NewTrade.tsx          # ✅ 骨架（表单待实现）
│   │   ├── Questionnaire.tsx     # ✅ 骨架（问卷 UI 待实现）
│   │   ├── Watchlist.tsx         # ✅ 骨架
│   │   ├── Analytics.tsx         # ✅ 骨架
│   │   └── admin/
│   │       └── Users.tsx         # ❌ 待创建
│   ├── context/
│   │   └── AuthContext.tsx       # ❌ 待创建（全局用户状态）
│   ├── hooks/
│   │   └── useAuth.ts            # ❌ 待创建
│   ├── types/index.ts            # ✅ 已含 User, DashboardStats 等类型
│   └── lib/
│       ├── api.ts                # ✅ 含 login(username, password) 函数
│       └── auth.ts               # ✅ getToken / setToken / clearToken
├── worker/
│   ├── index.ts                  # ⚠️ 需更新 Bindings + 注册 auth/users 路由
│   ├── auth.ts                   # ⚠️ 旧版单 Token，需完整替换为 PBKDF2+JWT
│   ├── types.ts                  # ⚠️ 需更新为多用户 Bindings + Variables
│   ├── db/
│   │   ├── schema.ts             # ⚠️ 需添加 users 表 + user_id FK
│   │   ├── index.ts              # ✅ Neon 连接
│   │   └── seed.ts               # ⚠️ 需添加初始管理员账号 seed 逻辑
│   ├── lib/                      # ❌ 目录待创建
│   │   ├── password.ts           # ❌ PBKDF2 哈希/验证
│   │   └── jwt.ts                # ❌ JWT 签发/验证（含 userId/role）
│   ├── middleware/
│   │   ├── auth.ts               # ⚠️ 旧版 token 比对，需替换为 JWT 验证
│   │   └── requireAdmin.ts       # ❌ 待创建
│   └── routes/
│       ├── auth.ts               # ❌ 待创建（login/logout/me/password）
│       ├── users.ts              # ❌ 待创建（管理员 CRUD）
│       ├── positions.ts          # ⚠️ 需加 user_id 隔离
│       ├── trades.ts             # ⚠️ 需加 user_id 隔离
│       ├── questionnaires.ts     # ⚠️ 需加 user_id 隔离
│       └── watchlist.ts          # ⚠️ 需加 user_id 隔离
├── public/
├── wrangler.toml
├── vite.config.ts
├── drizzle.config.ts
└── package.json
```

---

## 下一步：按顺序完成以下任务

### Step 1 — 更新 `worker/db/schema.ts`（添加 `users` 表 + `user_id` FK）

在现有 schema 的 **顶部** 增加 `userRoleEnum` 和 `users` 表，并在 `positions`、`watchlist` 表中追加 `userId` 字段：

```typescript
// 在文件顶部新增 enum
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'USER'])

// 在所有其他 pgTable 之前新增 users 表
export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  username:     varchar('username', { length: 50 }).notNull().unique(),
  displayName:  varchar('display_name', { length: 100 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  role:         userRoleEnum('role').notNull().default('USER'),
  isActive:     boolean('is_active').notNull().default(true),
  lastLoginAt:  timestamp('last_login_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// 在 positions 表中追加（紧跟 id 字段之后）
userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),

// 在 watchlist 表中追加（同样位置）
userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
```

完成后运行：
```bash
bun run db:generate   # 生成迁移文件
bun run db:migrate    # 执行迁移（需先配置 DATABASE_URL）
```

---

### Step 2 — 创建 `worker/lib/password.ts`（PBKDF2 密码工具）

```typescript
// worker/lib/password.ts
const ITERATIONS = 310_000  // OWASP 2024 推荐
const ENC = new TextEncoder()

export async function hashPassword(
  password: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const saltBytes = existingSalt
    ? Uint8Array.from(atob(existingSalt), c => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16))

  const keyMaterial = await crypto.subtle.importKey(
    'raw', ENC.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  )
  return {
    hash: btoa(String.fromCharCode(...new Uint8Array(hashBuffer))),
    salt: btoa(String.fromCharCode(...saltBytes)),
  }
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const { hash } = await hashPassword(password, storedSalt)
  // 等长比对（timing-safe）
  if (hash.length !== storedHash.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i)
  return diff === 0
}
```

---

### Step 3 — 创建 `worker/lib/jwt.ts`（含 userId 的 JWT）

```typescript
// worker/lib/jwt.ts
// 注意：依赖 jose 库。若 Cloudflare Workers 环境有兼容问题，
// 可改用下方纯 Web Crypto 实现（无外部依赖）。
import { SignJWT, jwtVerify } from 'jose'

export interface JwtPayload {
  sub: string          // userId
  username: string
  role: 'ADMIN' | 'USER'
}

const secret = (jwtSecret: string) => new TextEncoder().encode(jwtSecret)

export async function signToken(payload: JwtPayload, jwtSecret: string): Promise<string> {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret(jwtSecret))
}

export async function verifyToken(
  token: string,
  jwtSecret: string
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(jwtSecret))
    return {
      sub:      payload.sub as string,
      username: payload['username'] as string,
      role:     payload['role'] as 'ADMIN' | 'USER',
    }
  } catch {
    return null
  }
}
```

> 若不想引入 `jose`，可直接在 `worker/auth.ts` 基础上扩展 payload，将 `sub`/`username`/`role` 写入 JWT payload JSON 即可，无需额外依赖。

---

### Step 4 — 重写 `worker/middleware/auth.ts`

将现有的单 token 对比逻辑替换为 JWT 验证，并把用户信息挂到 Hono Context：

```typescript
// worker/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../lib/jwt'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

type Bindings = { DATABASE_URL: string; JWT_SECRET: string }
type Variables = { userId: string; userRole: 'ADMIN' | 'USER'; username: string }

export const authMiddleware = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  // 支持 Cookie 和 Authorization header 两种方式
  const cookieHeader = c.req.header('Cookie') ?? ''
  const cookieToken = cookieHeader.match(/(?:^|;\s*)tt_token=([^;]+)/)?.[1]
  const bearerToken = c.req.header('Authorization')?.replace('Bearer ', '').trim()
  const token = cookieToken ?? bearerToken

  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const payload = await verifyToken(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)

  // 验证账号是否仍处于激活状态（防止停用账号继续使用旧 token）
  const [user] = await db(c.env.DATABASE_URL)
    .select({ isActive: users.isActive })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1)

  if (!user?.isActive) return c.json({ error: 'Account disabled' }, 403)

  c.set('userId', payload.sub)
  c.set('userRole', payload.role)
  c.set('username', payload.username)
  await next()
})
```

---

### Step 5 — 创建 `worker/middleware/requireAdmin.ts`

```typescript
// worker/middleware/requireAdmin.ts
import { createMiddleware } from 'hono/factory'

type Variables = { userRole: 'ADMIN' | 'USER' }

export const requireAdmin = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  if (c.get('userRole') !== 'ADMIN') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
})
```

---

### Step 6 — 创建 `worker/routes/auth.ts`

```typescript
// worker/routes/auth.ts
import { Hono } from 'hono'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword, hashPassword } from '../lib/password'
import { signToken } from '../lib/jwt'
import { checkRateLimit } from '../auth'   // 复用已有的 rate limit 逻辑

type Bindings = { DATABASE_URL: string; JWT_SECRET: string }
type Variables = { userId: string; userRole: 'ADMIN' | 'USER'; username: string }

export const authRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// POST /api/auth/login
authRouter.post('/login', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const limit = checkRateLimit(ip)
  if (!limit.allowed) {
    return c.json({ error: `请求过于频繁，请 ${limit.retryAfter} 秒后重试` }, 429)
  }

  const { username, password } = await c.req.json<{ username: string; password: string }>()
  if (!username || !password) return c.json({ error: '参数缺失' }, 400)

  const [user] = await db(c.env.DATABASE_URL)
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase().trim()))
    .limit(1)

  if (!user || !user.isActive) return c.json({ error: '用户名或密码错误' }, 401)

  const valid = await verifyPassword(password, user.passwordHash, user.passwordSalt)
  if (!valid) return c.json({ error: '用户名或密码错误' }, 401)

  // 更新最近登录时间（不等待）
  db(c.env.DATABASE_URL)
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))
    .execute()
    .catch(() => {})

  const token = await signToken(
    { sub: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET
  )

  // 将 token 同时写入 httpOnly Cookie 和响应体（前端 localStorage 兼容方案）
  c.header('Set-Cookie',
    `tt_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 3600}`
  )
  return c.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role }
  })
})

// POST /api/auth/logout
authRouter.post('/logout', (c) => {
  c.header('Set-Cookie', 'tt_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')
  return c.json({ ok: true })
})

// GET /api/auth/me  — 需经过 authMiddleware
authRouter.get('/me', async (c) => {
  const [user] = await db(c.env.DATABASE_URL)
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, c.get('userId')))
    .limit(1)
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json(user)
})

// PUT /api/auth/password  — 修改自己的密码
authRouter.put('/password', async (c) => {
  const { currentPassword, newPassword } = await c.req.json<{
    currentPassword: string; newPassword: string
  }>()
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return c.json({ error: '新密码至少 8 位' }, 400)
  }

  const [user] = await db(c.env.DATABASE_URL)
    .select()
    .from(users)
    .where(eq(users.id, c.get('userId')))
    .limit(1)
  if (!user) return c.json({ error: 'Not found' }, 404)

  const valid = await verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)
  if (!valid) return c.json({ error: '当前密码错误' }, 401)

  const { hash, salt } = await hashPassword(newPassword)
  await db(c.env.DATABASE_URL)
    .update(users)
    .set({ passwordHash: hash, passwordSalt: salt, updatedAt: new Date() })
    .where(eq(users.id, user.id))
  return c.json({ ok: true })
})
```

---

### Step 7 — 创建 `worker/routes/users.ts`（管理员专用）

```typescript
// worker/routes/users.ts  — 全部路由均需 authMiddleware + requireAdmin
import { Hono } from 'hono'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../lib/password'

type Bindings = { DATABASE_URL: string }
type Variables = { userId: string; userRole: 'ADMIN' | 'USER' }

export const usersRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/users  — 用户列表
usersRouter.get('/', async (c) => {
  const list = await db(c.env.DATABASE_URL)
    .select({
      id: users.id, username: users.username, displayName: users.displayName,
      role: users.role, isActive: users.isActive,
      lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt)
  return c.json(list)
})

// POST /api/users  — 创建新用户
usersRouter.post('/', async (c) => {
  const { username, displayName, password, role } =
    await c.req.json<{ username: string; displayName: string; password: string; role?: 'ADMIN' | 'USER' }>()
  if (!username || !displayName || !password) return c.json({ error: '参数缺失' }, 400)
  if (password.length < 8) return c.json({ error: '密码至少 8 位' }, 400)

  const { hash, salt } = await hashPassword(password)
  const [user] = await db(c.env.DATABASE_URL)
    .insert(users)
    .values({
      username: username.toLowerCase().trim(),
      displayName,
      passwordHash: hash,
      passwordSalt: salt,
      role: role ?? 'USER',
    })
    .returning({ id: users.id, username: users.username, displayName: users.displayName, role: users.role })
  return c.json(user, 201)
})

// PUT /api/users/:id  — 修改用户（角色/停用）
usersRouter.put('/:id', async (c) => {
  const { displayName, role, isActive, password } =
    await c.req.json<{ displayName?: string; role?: 'ADMIN' | 'USER'; isActive?: boolean; password?: string }>()

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (displayName !== undefined) updates.displayName = displayName
  if (role !== undefined) updates.role = role
  if (isActive !== undefined) updates.isActive = isActive
  if (password) {
    if (password.length < 8) return c.json({ error: '密码至少 8 位' }, 400)
    const { hash, salt } = await hashPassword(password)
    updates.passwordHash = hash
    updates.passwordSalt = salt
  }

  const [user] = await db(c.env.DATABASE_URL)
    .update(users)
    .set(updates)
    .where(eq(users.id, c.req.param('id')))
    .returning({ id: users.id, username: users.username, isActive: users.isActive })
  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json(user)
})
```

---

### Step 8 — 更新 `worker/index.ts`

```typescript
// worker/index.ts — 完整替换
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { requireAdmin } from './middleware/requireAdmin'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { positionsRouter } from './routes/positions'
import { tradesRouter } from './routes/trades'
import { questionnairesRouter } from './routes/questionnaires'
import { watchlistRouter } from './routes/watchlist'

type Bindings = {
  DATABASE_URL: string
  JWT_SECRET: string          // ← 替换旧的 API_SECRET_TOKEN
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use('/api/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// 公开路由（不需要登录）
app.route('/api/auth', authRouter)
app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }))

// 需要登录的路由
app.use('/api/*', authMiddleware)
app.route('/api/auth', authRouter)        // /me 和 /password 挂在 authMiddleware 之后
app.use('/api/users', requireAdmin)        // 用户管理仅管理员
app.route('/api/users', usersRouter)
app.route('/api/positions', positionsRouter)
app.route('/api/trades', tradesRouter)
app.route('/api/questionnaires', questionnairesRouter)
app.route('/api/watchlist', watchlistRouter)

// 兜底：SPA 资源
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
```

> **注意**：`authRouter` 在 `authMiddleware` 前后各注册一次，原因是 `/login` 不需要鉴权，但 `/me` 和 `/password` 需要。更好的做法是在 `authRouter` 内部只对特定子路由应用中间件。

---

### Step 9 — 为所有业务路由加 `user_id` 过滤

以 `positions.ts` 为例：

```typescript
// worker/routes/positions.ts 修改要点
type Variables = { userId: string; userRole: 'ADMIN' | 'USER' }

// GET /api/positions — 只返回自己的
positionsRouter.get('/', async (c) => {
  const userId = c.get('userId')   // ← 从 JWT 中间件取
  const rows = await db(c.env.DATABASE_URL)
    .select()
    .from(positions)
    .where(eq(positions.userId, userId))  // ← 强制过滤
    .orderBy(desc(positions.createdAt))
  return c.json(rows)
})

// POST /api/positions — 创建时绑定 userId
positionsRouter.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const [row] = await db(c.env.DATABASE_URL)
    .insert(positions)
    .values({ ...body, userId })    // ← 注入 userId
    .returning()
  return c.json(row, 201)
})

// GET /api/positions/:id — 校验归属
positionsRouter.get('/:id', async (c) => {
  const userId = c.get('userId')
  const [row] = await db(c.env.DATABASE_URL)
    .select()
    .from(positions)
    .where(and(eq(positions.id, c.req.param('id')), eq(positions.userId, userId)))
    .limit(1)
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})
```

`trades.ts`、`watchlist.ts` 同理。`questionnaires.ts` 通过 JOIN `trade_records → positions.userId` 验证归属。

---

### Step 10 — 更新 `worker/db/seed.ts`（添加初始管理员）

```typescript
// 在 seed.ts 中追加管理员创建逻辑
import { hashPassword } from '../lib/password'
import { users } from './schema'

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456'

const { hash, salt } = await hashPassword(ADMIN_PASSWORD)
await db.insert(users).values({
  username: ADMIN_USERNAME,
  displayName: '超级管理员',
  passwordHash: hash,
  passwordSalt: salt,
  role: 'ADMIN',
}).onConflictDoNothing()  // 防止重复执行报错

console.log(`✅ 管理员账号已创建：${ADMIN_USERNAME}`)
```

---

### Step 11 — 更新 Cloudflare Workers 环境变量

**`wrangler.toml`** 中删除 `API_SECRET_TOKEN`，改为：

```toml
[vars]
# JWT_SECRET 在 Cloudflare Dashboard 中设置为加密变量，不写入 toml
```

**Cloudflare Dashboard → Workers & Pages → Settings → Variables** 中配置：
- `DATABASE_URL` — Neon 连接字符串
- `JWT_SECRET` — 至少 32 位随机字符串（**加密存储**）

**本地 `.dev.vars`**（gitignore 中已排除）：
```env
DATABASE_URL=postgresql://...
JWT_SECRET=local_dev_secret_change_in_prod
```

---

## 数据库 Schema 概览

### 表关系

```
users
  │
  ├── positions (user_id) ─── trade_records ─── questionnaires
  │         └──────────────────────────────── trade_reviews
  │
  └── watchlist (user_id)

questionnaire_templates  ← 全局共享，无 user_id
```

### 关键索引

```sql
CREATE INDEX ON positions (user_id, status);
CREATE INDEX ON trade_records (position_id);
CREATE INDEX ON watchlist (user_id) WHERE removed_at IS NULL;
```

---

## 前端待完成项

### AuthContext（全局用户状态）

```typescript
// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { User } from '@/types'

const AuthContext = createContext<{
  user: User | null
  loading: boolean
  logout: () => void
} | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<User>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    api.post('/auth/logout', {}).catch(() => {})
    localStorage.removeItem('tt_token')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

在 `src/main.tsx` 中用 `<AuthProvider>` 包裹整个应用。

---

## 问卷设计

### 买入问卷（100 分）

| # | 维度 | 满分 | 评分要点 |
|---|---|---|---|
| 1 | 基本面分析 | 20 | 0 = 未分析；20 = 财务/竞争/护城河深度研究 |
| 2 | 估值水平 | 15 | 显著高估→0；显著低估→15 |
| 3 | 仓位合理性 | 15 | 符合资金管理计划，未超单股上限 |
| 4 | 止损计划 | 15 | 明确止损位 + 执行逻辑 |
| 5 | 技术面信号 | 10 | 趋势/支撑/形态支持 |
| 6 | 催化剂明确性 | 10 | 近期有可识别催化剂 |
| 7 | 目标价位 | 10 | 设定目标价 + 逻辑依据 |
| 8 | 情绪稳定性 | 5 | 反向：越冲动越低 |

### 卖出问卷（100 分）

| # | 维度 | 满分 | 评分要点 |
|---|---|---|---|
| 1 | 卖出主因 | 25 | SELECT：达目标/止损/基本面恶化/调仓 |
| 2 | 计划执行度 | 20 | 是否按买入时计划执行 |
| 3 | 基本面变化评估 | 15 | 对变化的分析是否充分 |
| 4 | 情绪稳定性 | 15 | 恐慌/贪婪驱动→低分（反向） |
| 5 | 机会成本分析 | 10 | 持有 vs 卖出比较 |
| 6 | 时机依据 | 10 | 时机选择有充分依据 |
| 7 | 复盘意愿 | 5 | BOOL：是否愿意完成平仓复盘 |

### 评分等级

| 等级 | 分数 | 颜色 |
|---|---|---|
| **S** | 90–100 | `text-emerald-400` |
| **A** | 75–89 | `text-teal-400` |
| **B** | 60–74 | `text-yellow-400` |
| **C** | 45–59 | `text-orange-400` |
| **D** | 0–44 | `text-red-400` |

---

## 本地开发

```bash
# 1. 安装依赖
bun install

# 2. 配置本地环境变量
cp .env.example .dev.vars
# 编辑 .dev.vars，填入 DATABASE_URL 和 JWT_SECRET

# 3. 执行数据库迁移
bun run db:migrate

# 4. 初始化题目 + 管理员账号
bun run db:seed

# 5. 启动开发服务器（前端 + Worker 同时运行）
bun run dev
```

### 环境变量

```env
# .dev.vars（本地开发）/ Cloudflare Dashboard（生产）
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/trading_tracker?sslmode=require
JWT_SECRET=your_random_32plus_char_secret

# 仅用于 db:seed，不部署到 Worker
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=Admin@123456_change_me
```

---

## 部署

```bash
bun run build    # 编译前端
bun run deploy   # wrangler deploy
```

Cloudflare Dashboard → Workers & Pages → Settings → Environment Variables 中配置加密变量：`DATABASE_URL`、`JWT_SECRET`。

---

## 开发路线图

### Phase 1 — 核心功能（MVP）
- [x] 前端基础布局与路由
- [x] 登录页（用户名 + 密码）
- [x] 前端路由守卫（`RequireAuth`）
- [x] UI 组件库（Card, Button, Input, Modal, Badge, Skeleton）
- [x] 类型定义（User, Position, Trade, DashboardStats 等）
- [ ] `worker/db/schema.ts` — 添加 `users` 表 + `user_id` FK
- [ ] `worker/lib/password.ts` — PBKDF2 密码工具
- [ ] `worker/lib/jwt.ts` — JWT 签发/验证
- [ ] `worker/middleware/auth.ts` — 重写为 JWT 验证 + userId 注入
- [ ] `worker/routes/auth.ts` — login / logout / me / password
- [ ] `worker/routes/users.ts` — 管理员用户 CRUD
- [ ] `worker/index.ts` — 更新 Bindings + 路由注册
- [ ] 所有业务路由加 `user_id` 隔离
- [ ] `worker/db/seed.ts` — 初始管理员账号
- [ ] 数据库迁移
- [ ] 持仓/交易 CRUD 表单（`NewTrade.tsx`）
- [ ] 问卷流程（`Questionnaire.tsx`）

### Phase 2 — 看板与分析
- [ ] `AuthContext` + `useAuth` hook
- [ ] Dashboard KPI 接入真实数据
- [ ] Analytics 深度分析页（散点图、雷达图、月度盈亏）
- [ ] 自选股池完整功能
- [ ] 交易复盘功能
- [ ] 管理员用户管理页（`/admin/users`）

### Phase 3 — 体验优化
- [ ] 个人设置（修改密码、修改昵称）
- [ ] 问卷历史统计与个人偏差报告
- [ ] 交易 CSV 导入
- [ ] 多货币汇率换算
- [ ] PWA 移动端支持

---

## 安全说明

| 项目 | 实现方式 |
|---|---|
| 密码存储 | PBKDF2-SHA256，310,000 次迭代（OWASP 2024），每账号独立随机盐 |
| 会话令牌 | HS256 JWT，7 天有效期，httpOnly + Secure + SameSite=Lax Cookie |
| 数据隔离 | 所有业务查询 WHERE `user_id = $userId`（从 JWT 取值），不依赖客户端传入 |
| 停用账号 | authMiddleware 验证 JWT 后额外查询 `users.is_active` |
| 管理员操作 | `requireAdmin` 中间件检查 JWT payload 中的 `role` |
| 登录限速 | 同 IP 5 次失败后锁定 15 分钟（`worker/auth.ts` 中 `checkRateLimit`）|

---

*Built with ❤️ for better trading discipline.*
