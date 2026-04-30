# Trading Tracker

> 个人股票交易记录与决策质量分析系统

一个帮助你记录每笔交易、通过问卷评估决策质量、并在看板中分析交易行为模式的全栈 Web 应用。

---

## ✨ 功能概览

- **交易记录**：记录每笔买入/卖出操作，支持 A 股、港股、美股
- **决策问卷**：每次交易前完成结构化问卷，获得量化的决策质量评分
- **持仓管理**：实时计算当前持仓、成本均价、浮动盈亏
- **分析看板**：可视化你的交易行为、盈亏分布与决策质量相关性
- **自选股池**：维护一个待观察/待买入的标的清单
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
| 包管理 | Bun |

> 与 [ve-photo-gallery](https://github.com/CNVelocity/ve-photo-gallery) 保持相同的工程链：Vite + Tailwind v4 + Cloudflare Workers + Neon。

---

## 📁 项目结构

```
trading_tracker/
├── src/
│   ├── components/       # 通用 UI 组件
│   │   ├── ui/           # Button, Input, Modal, Badge, Card...
│   │   ├── charts/       # 图表组件（Recharts 封装）
│   │   └── layout/       # Sidebar, Header, Layout
│   ├── pages/            # 路由页面
│   │   ├── Dashboard.tsx       # 看板首页
│   │   ├── Trades.tsx          # 交易列表
│   │   ├── NewTrade.tsx        # 新建交易 + 问卷
│   │   ├── Position.tsx        # 单个持仓详情
│   │   ├── Positions.tsx       # 持仓总览
│   │   ├── Questionnaire.tsx   # 独立问卷页
│   │   ├── Watchlist.tsx       # 自选股
│   │   └── Analytics.tsx       # 深度分析
│   ├── hooks/            # 自定义 Hooks
│   ├── types/            # TypeScript 类型定义
│   ├── lib/              # 工具函数（格式化、计算等）
│   └── main.tsx
├── worker/
│   ├── index.ts          # Hono 应用入口
│   ├── routes/
│   │   ├── trades.ts
│   │   ├── positions.ts
│   │   ├── questionnaires.ts
│   │   └── watchlist.ts
│   ├── db/
│   │   ├── schema.ts     # Drizzle ORM Schema（见下方）
│   │   └── index.ts      # Neon 连接
│   └── middleware/
│       └── auth.ts       # 简单 Token 鉴权（单人使用）
├── public/
├── wrangler.toml
├── vite.config.ts
├── drizzle.config.ts
└── package.json
```

---

## 🗄️ 数据库设计（待批准）

> ⚠️ 以下 Schema 为预设方案，**请确认后再执行迁移**。

使用 **Neon PostgreSQL** + **Drizzle ORM**。

---

### Enum 类型

```sql
CREATE TYPE market_type AS ENUM ('A_SHARE', 'HK', 'US', 'ETF', 'OTHER');
CREATE TYPE direction_type AS ENUM ('BUY', 'SELL');
CREATE TYPE position_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE currency_type AS ENUM ('CNY', 'HKD', 'USD');
CREATE TYPE grade_type AS ENUM ('S', 'A', 'B', 'C', 'D');
CREATE TYPE question_type AS ENUM ('SCORE', 'BOOL', 'TEXT', 'SELECT');
```

---

### Table: `positions`（持仓/交易主体）

代表一次完整的交易周期（建仓 → 清仓）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | 主键 |
| `ticker` | `varchar(20)` NOT NULL | 股票代码，如 `000001`、`TSLA` |
| `name` | `varchar(100)` | 股票名称，如 `平安银行` |
| `market` | `market_type` NOT NULL | 市场类型 |
| `currency` | `currency_type` NOT NULL DEFAULT `CNY` | 计价货币 |
| `status` | `position_status` NOT NULL DEFAULT `OPEN` | 持仓状态 |
| `opened_at` | `date` NOT NULL | 建仓日期（首次买入日） |
| `closed_at` | `date` | 清仓日期 |
| `tags` | `text[]` | 标签数组，如 `["高股息", "科技"]` |
| `notes` | `text` | 备注 |
| `avg_cost` | `numeric(12,4)` | 当前持仓均价（加权，聚合更新） |
| `current_quantity` | `integer` | 当前持股数量 |
| `total_invested` | `numeric(14,4)` | 累计买入金额 |
| `realized_pnl` | `numeric(14,4)` | 已实现盈亏（卖出产生） |
| `created_at` | `timestamptz` DEFAULT `now()` | 创建时间 |
| `updated_at` | `timestamptz` DEFAULT `now()` | 更新时间 |

---

### Table: `trade_records`（单笔交易记录）

每次买入/卖出操作对应一条记录。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | 主键 |
| `position_id` | `uuid` FK → `positions.id` | 所属持仓 |
| `direction` | `direction_type` NOT NULL | 买入/卖出 |
| `trade_date` | `date` NOT NULL | 交易日期 |
| `price` | `numeric(12,4)` NOT NULL | 成交均价 |
| `quantity` | `integer` NOT NULL | 成交数量（股数） |
| `commission` | `numeric(10,4)` DEFAULT `0` | 手续费（含印花税等） |
| `currency` | `currency_type` NOT NULL DEFAULT `CNY` | 货币单位 |
| `total_amount` | `numeric(14,4)` | 成交金额（price × quantity，服务端计算） |
| `notes` | `text` | 备注 |
| `created_at` | `timestamptz` DEFAULT `now()` | 记录创建时间 |

> `total_amount = price × quantity ± commission`（买入加手续费，卖出扣手续费）

---

### Table: `questionnaire_templates`（问卷题目定义）

允许未来扩展/修改题目，不硬编码在前端。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| `direction` | `direction_type` | 适用于买入/卖出 |
| `question_key` | `varchar(50)` UNIQUE NOT NULL | 题目唯一标识，如 `fundamental_analysis` |
| `question_text` | `text` NOT NULL | 题目文本（中文） |
| `question_type` | `question_type` NOT NULL | 题型 |
| `options` | `jsonb` | SELECT 题型的选项，格式 `[{value, label, score}]` |
| `max_score` | `integer` DEFAULT `10` | 该题满分 |
| `weight` | `numeric(4,2)` DEFAULT `1.0` | 权重系数 |
| `hint` | `text` | 填写提示/评分说明 |
| `order_index` | `integer` | 显示顺序 |
| `is_active` | `boolean` DEFAULT `true` | 是否启用 |
| `created_at` | `timestamptz` DEFAULT `now()` | |

---

### Table: `questionnaires`（问卷答题记录）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| `trade_id` | `uuid` FK → `trade_records.id` UNIQUE | 一对一绑定交易 |
| `direction` | `direction_type` NOT NULL | 买入/卖出问卷 |
| `answers` | `jsonb` NOT NULL | 各题答案，格式 `{question_key: {score, text, selected}}` |
| `total_score` | `integer` NOT NULL | 综合得分（0-100） |
| `grade` | `grade_type` NOT NULL | 等级 |
| `completed_at` | `timestamptz` NOT NULL | 完成时间 |
| `created_at` | `timestamptz` DEFAULT `now()` | |

---

### Table: `trade_reviews`（交易复盘）

仅在持仓 CLOSED 后才允许填写。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| `position_id` | `uuid` FK → `positions.id` UNIQUE | |
| `actual_return_pct` | `numeric(8,4)` | 实际收益率（%） |
| `hold_days` | `integer` | 持仓天数 |
| `what_went_right` | `text` | 做对了什么 |
| `what_went_wrong` | `text` | 做错了什么 |
| `lessons` | `text` | 经验教训 |
| `would_do_again` | `boolean` | 复盘后，同样情况是否还会买入 |
| `outcome_score` | `integer` CHECK(1-10) | 对结果的综合自评分 |
| `reviewed_at` | `timestamptz` NOT NULL | |
| `created_at` | `timestamptz` DEFAULT `now()` | |

---

### Table: `watchlist`（自选股/观察池）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| `ticker` | `varchar(20)` NOT NULL | 股票代码 |
| `name` | `varchar(100)` | 股票名称 |
| `market` | `market_type` NOT NULL | |
| `currency` | `currency_type` DEFAULT `CNY` | |
| `target_buy_price` | `numeric(12,4)` | 目标买入价格 |
| `reason` | `text` | 加入自选的理由 |
| `priority` | `varchar(10)` DEFAULT `MEDIUM` | HIGH / MEDIUM / LOW |
| `removed_at` | `timestamptz` | 移除时间（软删除） |
| `notes` | `text` | |
| `created_at` | `timestamptz` DEFAULT `now()` | |

---

## 📋 问卷设计

### 买入问卷（100分）

系统评估你的买入决策质量，满分 100 分。

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
| 1 | 卖出主因 | SELECT | 25 | 达目标价/止损/基本面恶化/调仓，有充分理由得满分 |
| 2 | 计划执行度 | SCORE | 20 | 是否按买入时制定的止盈止损计划执行 |
| 3 | 基本面变化评估 | SCORE | 15 | 对基本面变化的分析是否充分 |
| 4 | 情绪稳定性 | SCORE | 15 | 是否受到恐慌/贪婪等情绪驱动（反向） |
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

### Dashboard（首页看板）

- **KPI 卡片**：总资产投入 / 已实现盈亏 / 平均决策评分 / 胜率
- **持仓状态总览**：OPEN 仓位列表，显示浮动盈亏
- **近期交易时间线**：最近 10 笔交易记录
- **决策评分趋势**：最近 30 天的问卷分数折线图

### Analytics（深度分析）

- **决策分 vs 收益率散点图**：验证决策质量与盈亏的相关性
- **各维度评分雷达图**：识别长期薄弱项（如"情绪稳定性"总是低分）
- **持仓时长分布**：直方图，分析持仓时间习惯
- **市场分布饼图**：持仓市场结构
- **月度盈亏柱状图**：按月统计已实现盈亏
- **标签绩效**：不同策略标签下的平均收益率对比

---

## 🚀 快速开始

### 前置条件

- [Bun](https://bun.sh/) >= 1.0
- [Cloudflare 账号](https://cloudflare.com/)（部署用）
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

# 5. 填充初始问卷题目
bun run db:seed

# 6. 启动开发服务器（前端 + Worker 同时启动）
bun run dev
```

### 环境变量

```env
# Neon PostgreSQL 连接字符串
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/trading_tracker?sslmode=require

# 单人使用的访问令牌（Worker 端鉴权）
API_SECRET_TOKEN=your_secret_token_here

# 可选：时区
TZ=Asia/Shanghai
```

---

## ☁️ 部署到 Cloudflare Pages

```bash
# 构建并部署
bun run deploy
```

在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 中配置 Worker 的环境变量：
- `DATABASE_URL`
- `API_SECRET_TOKEN`

Worker 路由通过 `wrangler.toml` 配置，前端页面通过 Cloudflare Pages 自动部署。

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
- [ ] 持仓/交易 CRUD
- [ ] 买入/卖出问卷流程
- [ ] 持仓总览页面

### Phase 2 — 看板与分析
- [ ] Dashboard KPI 看板
- [ ] Analytics 深度分析页
- [ ] 自选股池
- [ ] 交易复盘功能

### Phase 3 — 体验优化
- [ ] 问卷历史统计与个人偏差报告
- [ ] 交易导入（CSV）
- [ ] 多货币汇率换算
- [ ] PWA 移动端支持

---

## 📝 数据库迁移命令

```bash
# 生成迁移文件
bun run db:generate

# 执行迁移
bun run db:migrate

# 打开 Drizzle Studio（可视化数据库）
bun run db:studio

# 填充初始数据（问卷题目）
bun run db:seed
```

---

## 🔐 鉴权说明

本项目为个人单用户使用，采用简单的 Bearer Token 鉴权：

1. 在 Worker 环境变量中设置 `API_SECRET_TOKEN`
2. 前端在 `localStorage` 中存储 Token（首次访问时输入）
3. 所有 API 请求携带 `Authorization: Bearer <token>` Header
4. Worker Middleware 验证 Token，不通过返回 401

> 如需多用户支持，后续可接入 Cloudflare Access 或 Clerk。

---

*Built with ❤️ for better trading discipline.*
