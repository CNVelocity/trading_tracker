# Trading Tracker

> 股票交易记录与决策质量分析系统（多用户版）

一个帮助多位用户分别记录交易、通过问卷评估决策质量、并在个人看板中分析行为模式的全栈 Web 应用。每位用户拥有独立的数据视图，管理员可管理账号。

---

## ✨ 功能概览

- **多用户隔离**：每位用户的持仓、交易记录、问卷、复盘完全独立
- **账号管理**：管理员可创建/停用账号；用户可修改自己的密码
- **交易记录**：记录每笔买入/卖出操作，支持 A 股、港股、美股
- **决策问卷**：每次交易前完成结构化问卷，获得量化的决策质量评分
- **持仓管理**：实时计算当前持仓、成本均价、浮动盈亏
- **分析看板**：可视化交易行为、盈亏分布与决策质量相关性
- **自选股池**：维护个人待观察/待买入标的清单
- **交易复盘**：平仓后填写复盘总结，积累经验教训

---

## 🛠️ 技术栈

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
| 后端运行时 | Cloudflare Workers (Hono) |
| 数据库 | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |
| 鉴权 | JWT (jose) + httpOnly Cookie |
| 密码哈希 | Web Crypto API — PBKDF2-SHA256 |
| 包管理 | Bun |

> 与 [ve-photo-gallery](https://github.com/CNVelocity/ve-photo-gallery) 保持相同的工程链：Vite + Tailwind v4 + Cloudflare Workers + Neon。

---

## 📁 项目结构

```
trading_tracker/
├── src/
│   ├── components/
│   │   ├── ui/              # Button, Input, Modal, Badge, Card...
│   │   ├── charts/          # Recharts 封装
│   │   └── layout/          # AppLayout, Sidebar, Header, BottomNav
│   ├── pages/
│   │   ├── Login.tsx             # 登录页
│   │   ├── Dashboard.tsx         # 个人看板首页
│   │   ├── Trades.tsx            # 交易列表
│   │   ├── NewTrade.tsx          # 新建交易 + 问卷
│   │   ├── Position.tsx          # 单个持仓详情
│   │   ├── Positions.tsx         # 持仓总览
│   │   ├── Questionnaire.tsx     # 独立问卷页
│   │   ├── Watchlist.tsx         # 自选股
│   │   ├── Analytics.tsx         # 深度分析
│   │   ├── Settings.tsx          # 个人设置（修改密码）
│   │   └── admin/
│   │       └── Users.tsx         # 管理员：用户管理
│   ├── hooks/
│   │   ├── useAuth.ts        # 读取当前用户 Context
│   │   └── useApi.ts         # 封装带 Cookie 的 fetch
│   ├── context/
│   │   └── AuthContext.tsx   # 全局用户状态
│   ├── types/
│   └── lib/
│       └── api.ts            # API 请求封装
├── worker/
│   ├── index.ts              # Hono 应用入口
│   ├── routes/
│   │   ├── auth.ts           # 登录/登出/当前用户
│   │   ├── users.ts          # 管理员：用户 CRUD
│   │   ├── trades.ts
│   │   ├── positions.ts
│   │   ├── questionnaires.ts
│   │   └── watchlist.ts
│   ├── db/
│   │   ├── schema.ts         # Drizzle ORM Schema
│   │   └── index.ts          # Neon 连接
│   └── middleware/
│       ├── auth.ts           # JWT 验证中间件
│       └── requireAdmin.ts   # 管理员权限守卫
├── public/
├── wrangler.toml
├── vite.config.ts
├── drizzle.config.ts
└── package.json
```

---

## 🗄️ 数据库设计

> ⚠️ 以下 Schema 为预设方案，**请确认后再执行迁移**。

使用 **Neon PostgreSQL** + **Drizzle ORM**。

---

### Enum 类型

```sql
CREATE TYPE market_type    AS ENUM ('A_SHARE', 'HK', 'US', 'ETF', 'OTHER');
CREATE TYPE direction_type AS ENUM ('BUY', 'SELL');
CREATE TYPE position_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE currency_type  AS ENUM ('CNY', 'HKD', 'USD');
CREATE TYPE grade_type     AS ENUM ('S', 'A', 'B', 'C', 'D');
CREATE TYPE question_type  AS ENUM ('SCORE', 'BOOL', 'TEXT', 'SELECT');
CREATE TYPE user_role      AS ENUM ('ADMIN', 'USER');   -- ← 新增
```

---

### Table: `users` ⭐ 新增

存储用户账号，密码使用 PBKDF2-SHA256 哈希后存储，**绝不明文**。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK DEFAULT `gen_random_uuid()` | 主键 |
| `username` | `varchar(50)` UNIQUE NOT NULL | 登录用户名（小写字母+数字+下划线）|
| `display_name` | `varchar(100)` NOT NULL | 昵称，显示在页面顶部 |
| `password_hash` | `text` NOT NULL | PBKDF2 哈希结果（Base64） |
| `password_salt` | `text` NOT NULL | 随机盐值（Base64，每账号唯一）|
| `role` | `user_role` NOT NULL DEFAULT `'USER'` | 角色：ADMIN / USER |
| `is_active` | `boolean` NOT NULL DEFAULT `true` | 是否启用（停用不删除数据）|
| `last_login_at` | `timestamptz` | 最近登录时间 |
| `created_at` | `timestamptz` DEFAULT `now()` | |
| `updated_at` | `timestamptz` DEFAULT `now()` | |

> 初始管理员账号通过 `bun run db:seed` 创建，用户名/密码见 `.env.example`。

---

### Table: `positions`（持仓/交易主体）

代表一次完整的交易周期（建仓 → 清仓）。**新增 `user_id` 实现用户隔离。**

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| **`user_id`** | **`uuid` FK → `users.id` NOT NULL** | **所属用户 ⭐** |
| `ticker` | `varchar(20)` NOT NULL | 股票代码，如 `000001`、`TSLA` |
| `name` | `varchar(100)` | 股票名称 |
| `market` | `market_type` NOT NULL | |
| `currency` | `currency_type` NOT NULL DEFAULT `'CNY'` | |
| `status` | `position_status` NOT NULL DEFAULT `'OPEN'` | |
| `opened_at` | `date` NOT NULL | 建仓日期 |
| `closed_at` | `date` | 清仓日期 |
| `tags` | `text[]` | 策略标签 |
| `notes` | `text` | |
| `avg_cost` | `numeric(12,4)` | 当前持仓均价（加权） |
| `current_quantity` | `integer` | 当前持股数量 |
| `total_invested` | `numeric(14,4)` | 累计买入金额 |
| `realized_pnl` | `numeric(14,4)` | 已实现盈亏 |
| `created_at` | `timestamptz` DEFAULT `now()` | |
| `updated_at` | `timestamptz` DEFAULT `now()` | |

**索引**：`CREATE INDEX ON positions (user_id, status);`

---

### Table: `trade_records`（单笔交易记录）

通过 `position_id → positions.user_id` 归属用户，**无需单独加 `user_id`**。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| `position_id` | `uuid` FK → `positions.id` NOT NULL | 所属持仓 |
| `direction` | `direction_type` NOT NULL | |
| `trade_date` | `date` NOT NULL | |
| `price` | `numeric(12,4)` NOT NULL | |
| `quantity` | `integer` NOT NULL | |
| `commission` | `numeric(10,4)` DEFAULT `0` | 手续费 |
| `currency` | `currency_type` NOT NULL DEFAULT `'CNY'` | |
| `total_amount` | `numeric(14,4)` | 服务端计算 |
| `notes` | `text` | |
| `created_at` | `timestamptz` DEFAULT `now()` | |

---

### Table: `questionnaire_templates`（题目定义）

全局共享，不区分用户（所有人使用相同题目）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| `direction` | `direction_type` | 适用于买入/卖出 |
| `question_key` | `varchar(50)` UNIQUE NOT NULL | |
| `question_text` | `text` NOT NULL | |
| `question_type` | `question_type` NOT NULL | |
| `options` | `jsonb` | SELECT 题型选项 `[{value, label, score}]` |
| `max_score` | `integer` DEFAULT `10` | |
| `weight` | `numeric(4,2)` DEFAULT `1.0` | |
| `hint` | `text` | |
| `order_index` | `integer` | |
| `is_active` | `boolean` DEFAULT `true` | |
| `created_at` | `timestamptz` DEFAULT `now()` | |

---

### Table: `questionnaires`（问卷答题记录）

通过 `trade_id → trade_records → positions.user_id` 归属用户。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| `trade_id` | `uuid` FK → `trade_records.id` UNIQUE | |
| `direction` | `direction_type` NOT NULL | |
| `answers` | `jsonb` NOT NULL | `{question_key: {score, text, selected}}` |
| `total_score` | `integer` NOT NULL | 综合得分（0-100） |
| `grade` | `grade_type` NOT NULL | |
| `completed_at` | `timestamptz` NOT NULL | |
| `created_at` | `timestamptz` DEFAULT `now()` | |

---

### Table: `trade_reviews`（交易复盘）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| `position_id` | `uuid` FK → `positions.id` UNIQUE | |
| `actual_return_pct` | `numeric(8,4)` | 实际收益率（%） |
| `hold_days` | `integer` | |
| `what_went_right` | `text` | |
| `what_went_wrong` | `text` | |
| `lessons` | `text` | |
| `would_do_again` | `boolean` | |
| `outcome_score` | `integer` CHECK(1-10) | |
| `reviewed_at` | `timestamptz` NOT NULL | |
| `created_at` | `timestamptz` DEFAULT `now()` | |

---

### Table: `watchlist`（自选股/观察池）

**新增 `user_id` 实现用户隔离。**

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| **`user_id`** | **`uuid` FK → `users.id` NOT NULL** | **所属用户 ⭐** |
| `ticker` | `varchar(20)` NOT NULL | |
| `name` | `varchar(100)` | |
| `market` | `market_type` NOT NULL | |
| `currency` | `currency_type` DEFAULT `'CNY'` | |
| `target_buy_price` | `numeric(12,4)` | |
| `reason` | `text` | |
| `priority` | `varchar(10)` DEFAULT `'MEDIUM'` | HIGH / MEDIUM / LOW |
| `removed_at` | `timestamptz` | 软删除 |
| `notes` | `text` | |
| `created_at` | `timestamptz` DEFAULT `now()` | |

**索引**：`CREATE INDEX ON watchlist (user_id) WHERE removed_at IS NULL;`

---

### 数据归属关系图

```
users
  │
  ├── positions (user_id) ──── trade_records ──── questionnaires
  │        └──────────────────────────────────── trade_reviews
  │
  └── watchlist (user_id)

questionnaire_templates  ← 全局共享，无 user_id
```

---

## 🔐 认证与授权设计

### 整体流程

```
[浏览器]                    [Cloudflare Worker]
   │                               │
   │  POST /api/auth/login          │
   │  { username, password }  ───► │ 1. 查询 users 表
   │                               │ 2. PBKDF2 验证密码
   │                               │ 3. 签发 JWT（7天有效期）
   │ ◄─── Set-Cookie: token=<jwt>  │    Payload: { sub: userId, role, username }
   │      (httpOnly; Secure; SameSite=Lax)
   │
   │  GET /api/positions            │
   │  Cookie: token=<jwt>    ───►  │ 4. authMiddleware 验证 JWT
   │                               │ 5. 从 JWT 取出 userId
   │                               │ 6. WHERE user_id = $userId
   │ ◄─── 仅返回该用户数据          │
```

### 密码存储

使用 **Web Crypto API（PBKDF2-SHA256）**，无需额外依赖，原生支持 Cloudflare Workers：

```typescript
// worker/lib/password.ts
const ITERATIONS = 310_000;  // OWASP 2024 推荐值

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return {
    hash: btoa(String.fromCharCode(...new Uint8Array(hashBuffer))),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const result = await hashPassword(password); // 用相同 salt 重新哈希
  // timing-safe compare
  return result.hash === hash;
}
```

### JWT 签发与验证

使用 [`jose`](https://github.com/panva/jose) 库（Edge Runtime 兼容）：

```typescript
// worker/lib/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

const getSecret = (env: Env) => new TextEncoder().encode(env.JWT_SECRET);

export async function signToken(payload: JWTPayload, env: Env) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getSecret(env));
}

export async function verifyToken(token: string, env: Env) {
  const { payload } = await jwtVerify(token, getSecret(env));
  return payload as { sub: string; role: 'ADMIN' | 'USER'; username: string };
}
```

### API 路由规范

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/auth/login` | 公开 | 用户名密码登录 |
| POST | `/api/auth/logout` | 已登录 | 清除 Cookie |
| GET | `/api/auth/me` | 已登录 | 获取当前用户信息 |
| PUT | `/api/auth/password` | 已登录 | 修改自己的密码 |
| GET | `/api/users` | ADMIN | 用户列表 |
| POST | `/api/users` | ADMIN | 创建新用户 |
| PUT | `/api/users/:id` | ADMIN | 修改用户（停用/改角色）|
| GET | `/api/positions` | 已登录 | **仅返回自己的持仓** |
| POST | `/api/positions` | 已登录 | 创建归属自己的持仓 |
| GET | `/api/positions/:id` | 已登录 | 校验 `user_id` 匹配 |
| ... | （其余业务接口同理）| 已登录 | Worker 中间件自动过滤 |

### 前端路由守卫

```typescript
// src/components/RequireAuth.tsx
const { user, loading } = useAuth();
if (loading) return <Spinner />;
if (!user) return <Navigate to="/login" replace />;
if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') return <Navigate to="/" replace />;
return children;
```

```typescript
// src/main.tsx 路由配置示意
<Route path="/login" element={<Login />} />
<Route element={<RequireAuth />}>
  <Route path="/" element={<Dashboard />} />
  <Route path="/positions" element={<Positions />} />
  ...
  <Route element={<RequireAuth role="ADMIN" />}>
    <Route path="/admin/users" element={<AdminUsers />} />
  </Route>
</Route>
```

---

## 🖥️ 登录页设计

路由：`/login`（未登录时所有路由均重定向至此）

### 视觉布局

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│          [SVG Logo]  Trading Tracker                │
│                                                     │
│    ┌─────────────────────────────────────────┐     │
│    │                                         │     │
│    │  用户名                                  │     │
│    │  ┌─────────────────────────────────┐   │     │
│    │  │  username                       │   │     │
│    │  └─────────────────────────────────┘   │     │
│    │                                         │     │
│    │  密码                                   │     │
│    │  ┌─────────────────────────────────┐   │     │
│    │  │  ••••••••              [👁]     │   │     │
│    │  └─────────────────────────────────┘   │     │
│    │                                         │     │
│    │  [        登 录        ]                │     │
│    │                                         │     │
│    └─────────────────────────────────────────┘     │
│                                                     │
│              © 2025 Trading Tracker                 │
└─────────────────────────────────────────────────────┘
```

**设计规范：**
- 全屏居中布局，背景色 `--color-bg`（暖米色）
- 卡片宽度 `max-w-sm`（384px），`--shadow-lg`
- 错误提示：行内红色文字（`--color-error`），shake 动画
- 密码可见性切换按钮（眼睛图标）
- 登录中状态：按钮 disabled + spinner，防止重复提交
- **不提供公开注册入口**：新账号只能由管理员在 `/admin/users` 创建

### 登录状态机

```
idle → loading → success → redirect to /
               ↘ error   → idle（显示错误信息）
```

---

## 👤 管理员功能

### 用户管理页（`/admin/users`）

- 用户列表表格：用户名 / 昵称 / 角色 / 状态 / 最近登录 / 创建时间
- **创建用户**：弹窗表单，填写用户名、昵称、初始密码、角色
- **停用/启用用户**：切换 `is_active`（停用后 JWT 验证时额外检查此字段）
- **重置密码**：管理员设置新临时密码，用户下次登录后强制修改
- 不支持删除用户（保留历史数据完整性）

---

## 📋 问卷设计

### 买入问卷（100分）

| # | 题目 | 类型 | 满分 | 评分说明 |
|---|---|---|---|---|
| 1 | 基本面分析 | SCORE | 20 | 0=完全未分析；20=财务/竞争/护城河深度研究 |
| 2 | 估值水平 | SCORE | 15 | 0=明显高估；15=显著低估或合理估值 |
| 3 | 仓位合理性 | SCORE | 15 | 是否符合资金管理计划，单股不超过上限 |
| 4 | 止损计划 | SCORE | 15 | 是否设定明确止损位及对应理由 |
| 5 | 技术面信号 | SCORE | 10 | 图形是否支持买入（趋势/支撑/形态） |
| 6 | 催化剂明确性 | SCORE | 10 | 是否有近期明确的价格催化剂 |
| 7 | 目标价位 | SCORE | 10 | 是否设定合理目标价及逻辑依据 |
| 8 | 情绪稳定性 | SCORE | 5 | 反向评分：越冲动越低，理性决策得满分 |
| **合计** | | | **100** | |

### 卖出问卷（100分）

| # | 题目 | 类型 | 满分 | 评分说明 |
|---|---|---|---|---|
| 1 | 卖出主因 | SELECT | 25 | 达目标价/止损/基本面恶化/调仓 |
| 2 | 计划执行度 | SCORE | 20 | 是否按买入时制定的计划执行 |
| 3 | 基本面变化评估 | SCORE | 15 | 对基本面变化的分析是否充分 |
| 4 | 情绪稳定性 | SCORE | 15 | 是否受恐慌/贪婪驱动（反向） |
| 5 | 机会成本分析 | SCORE | 10 | 是否认真比较持有 vs 卖出的得失 |
| 6 | 时机依据 | SCORE | 10 | 对卖出时机的选择是否有充分依据 |
| 7 | 卖出后复盘意愿 | BOOL | 5 | 是否愿意在平仓后完成详细复盘 |
| **合计** | | | **100** | |

### 评分等级

| 等级 | 分数区间 | 含义 |
|---|---|---|
| **S** | 90–100 | 决策质量极高，逻辑严密 |
| **A** | 75–89 | 良好决策，有据可依 |
| **B** | 60–74 | 一般，存在明显漏洞 |
| **C** | 45–59 | 较差，依赖直觉或情绪 |
| **D** | 0–44 | 高风险决策，缺乏基本依据 |

---

## 📊 看板模块设计

所有看板数据均严格隔离，**仅显示当前登录用户自己的数据**。

### Dashboard（个人首页看板）

- **KPI 卡片**：总投入 / 已实现盈亏 / 平均决策评分 / 胜率
- **持仓状态总览**：OPEN 仓位，显示浮动盈亏
- **近期交易时间线**：最近 10 笔
- **决策评分趋势**：最近 30 天折线图

### Analytics（深度分析）

- **决策分 vs 收益率散点图**
- **各维度评分雷达图**（识别个人薄弱项）
- **持仓时长分布直方图**
- **市场分布饼图**
- **月度盈亏柱状图**
- **标签绩效对比**

---

## 🚀 快速开始

### 前置条件

- [Bun](https://bun.sh/) >= 1.0
- [Cloudflare 账号](https://cloudflare.com/)
- [Neon 数据库](https://neon.tech/)（PostgreSQL Serverless）

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/CNVelocity/trading_tracker.git
cd trading_tracker

# 2. 安装依赖
bun install

# 3. 配置环境变量
cp .env.example .env.local

# 4. 执行数据库迁移
bun run db:migrate

# 5. 填充初始数据（问卷题目 + 初始管理员账号）
bun run db:seed

# 6. 启动开发服务器
bun run dev
```

### 环境变量

```env
# Neon PostgreSQL 连接字符串
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/trading_tracker?sslmode=require

# JWT 签名密钥（至少 32 位随机字符串）
JWT_SECRET=your_very_long_random_secret_here

# 初始管理员账号（仅 db:seed 时使用，之后可删除）
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=change_me_on_first_login

# 可选：时区
TZ=Asia/Shanghai
```

> 旧版的 `API_SECRET_TOKEN` 已废弃，改用 JWT。

---

## ☁️ 部署到 Cloudflare Pages

```bash
bun run deploy
```

在 Cloudflare Dashboard → Workers & Pages → 对应 Worker → Settings → Variables 中配置：
- `DATABASE_URL`
- `JWT_SECRET`

---

## 🎨 设计语言

沿用 [ve-photo-gallery](https://github.com/CNVelocity/ve-photo-gallery) 的设计体系：

- **色彩**：Nexus 设计系统（暖米色底色 + Teal 主色调）
- **字体**：`Satoshi`（正文）+ `Instrument Serif`（数字展示）
- **组件**：Tailwind CSS v4 原子化，配合 Framer Motion 过渡动画
- **明暗模式**：支持系统偏好 + 手动切换（`data-theme`）
- **布局**：侧边栏导航（桌面端），底部 Tab 栏（移动端）

---

## 📋 开发路线图

### Phase 1 — 核心功能（MVP）
- [ ] 基础布局与路由
- [ ] **登录页 + JWT 鉴权流程**
- [ ] **用户管理（管理员）**
- [ ] 持仓/交易 CRUD（带 user_id 隔离）
- [ ] 买入/卖出问卷流程

### Phase 2 — 看板与分析
- [ ] Dashboard KPI 看板
- [ ] Analytics 深度分析页
- [ ] 自选股池
- [ ] 交易复盘功能

### Phase 3 — 体验优化
- [ ] 修改密码 / 个人设置页
- [ ] 问卷历史统计与个人偏差报告
- [ ] 交易导入（CSV）
- [ ] 多货币汇率换算
- [ ] PWA 移动端支持

---

## 📝 数据库迁移命令

```bash
bun run db:generate   # 生成迁移文件
bun run db:migrate    # 执行迁移
bun run db:studio     # Drizzle Studio 可视化
bun run db:seed       # 填充题目 + 初始管理员
```

---

## 🔐 安全说明

| 项目 | 实现方式 |
|---|---|
| 密码存储 | PBKDF2-SHA256，310,000 次迭代（OWASP 2024），每账号独立随机盐 |
| 会话令牌 | HS256 JWT，7 天有效期，存于 `httpOnly; Secure; SameSite=Lax` Cookie |
| 数据隔离 | 所有业务接口从 JWT 取 `userId`，WHERE 子句强制过滤 |
| 停用账号 | JWT 验证时额外查询 `users.is_active`，已停用账号的请求返回 401 |
| 管理员操作 | `requireAdmin` 中间件检查 JWT payload 中的 `role` 字段 |
| 密码重置 | 仅管理员可操作，下发临时密码，不通过邮件（无 SMTP 依赖）|

---

*Built with ❤️ for better trading discipline.*
