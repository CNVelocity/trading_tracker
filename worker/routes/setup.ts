import { Hono } from 'hono'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { users, questionnaireTemplates, systemConfig } from '../db/schema'
import { hashPassword } from '../lib/password'
import type { HonoBindings } from '../types'

const router = new Hono<{ Bindings: HonoBindings }>()

// POST /api/setup
// 一次性初始化端点：创建管理员账号 + 问卷模板
// 需要在 CF Pages 环境变量中设置 SETUP_TOKEN
router.post('/', async (c) => {
  const db = drizzle(neon(c.env.DATABASE_URL))

  // ── 1. 验证 SETUP_TOKEN ──────────────────────────────────────
  const setupToken = c.env.SETUP_TOKEN
  if (!setupToken) {
    return c.json({ error: 'Setup is disabled (SETUP_TOKEN not configured)' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  if (body.setupToken !== setupToken) {
    return c.json({ error: 'Invalid setup token' }, 401)
  }

  // ── 2. 检查是否已完成初始化 ───────────────────────────────────
  const existing = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, 'setup_completed'))
    .limit(1)

  if (existing.length > 0 && existing[0].value === 'true') {
    return c.json({ error: 'Setup has already been completed' }, 409)
  }

  // ── 3. 校验请求参数 ───────────────────────────────────────────
  const { username, password, displayName } = body
  if (!username || !password) {
    return c.json({ error: 'username and password are required' }, 400)
  }
  if (password.length < 8) {
    return c.json({ error: 'password must be at least 8 characters' }, 400)
  }

  // ── 4. 创建管理员账号 ─────────────────────────────────────────
  const { hash, salt } = await hashPassword(password)
  await db.insert(users).values({
    username:     username.toLowerCase().trim(),
    displayName:  displayName ?? username,
    passwordHash: hash,
    passwordSalt: salt,
    role:         'ADMIN',
  }).onConflictDoNothing()

  // ── 5. 写入问卷模板 ───────────────────────────────────────────
  await db.delete(questionnaireTemplates)

  const buyTemplates = [
    {
      direction: 'BUY' as const,
      questionKey: 'fundamental_analysis',
      questionText: '基本面分析完整程度',
      questionType: 'SCORE' as const,
      maxScore: 20,
      hint: '0=完全未分析；20=包含财务、竞争格局、护城河的深度研究',
      orderIndex: 1,
    },
    {
      direction: 'BUY' as const,
      questionKey: 'valuation',
      questionText: '当前估值水平评估',
      questionType: 'SCORE' as const,
      maxScore: 15,
      hint: '0=明显高估；15=显著低估或处于历史合理区间',
      orderIndex: 2,
    },
    {
      direction: 'BUY' as const,
      questionKey: 'position_sizing',
      questionText: '仓位管理合理性',
      questionType: 'SCORE' as const,
      maxScore: 15,
      hint: '是否符合资金管理计划？单股仓位是否在设定上限以内？',
      orderIndex: 3,
    },
    {
      direction: 'BUY' as const,
      questionKey: 'stop_loss_plan',
      questionText: '止损计划完整性',
      questionType: 'SCORE' as const,
      maxScore: 15,
      hint: '是否设定明确止损位，并有对应的逻辑依据？',
      orderIndex: 4,
    },
    {
      direction: 'BUY' as const,
      questionKey: 'technical_signal',
      questionText: '技术面信号支持',
      questionType: 'SCORE' as const,
      maxScore: 10,
      hint: '价格趋势、支撑位、技术形态是否支持买入？',
      orderIndex: 5,
    },
    {
      direction: 'BUY' as const,
      questionKey: 'catalyst',
      questionText: '近期催化剂明确性',
      questionType: 'SCORE' as const,
      maxScore: 10,
      hint: '是否有近期可预期的价格催化剂（业绩、政策、事件等）？',
      orderIndex: 6,
    },
    {
      direction: 'BUY' as const,
      questionKey: 'target_price',
      questionText: '目标价位设定',
      questionType: 'SCORE' as const,
      maxScore: 10,
      hint: '是否设定合理目标价，且有清晰的逻辑支撑？',
      orderIndex: 7,
    },
    {
      direction: 'BUY' as const,
      questionKey: 'emotion_stability',
      questionText: '情绪稳定性',
      questionType: 'SCORE' as const,
      maxScore: 5,
      hint: '反向评分：决策是否受到 FOMO/追高/冲动等情绪驱动？理性决策得5分，明显冲动得0分',
      orderIndex: 8,
    },
  ]

  const sellTemplates = [
    {
      direction: 'SELL' as const,
      questionKey: 'sell_reason',
      questionText: '卖出主要原因',
      questionType: 'SELECT' as const,
      maxScore: 25,
      options: JSON.stringify([
        { value: 'target_reached',     label: '达到目标价',       score: 25 },
        { value: 'stop_loss',          label: '触发止损位',       score: 25 },
        { value: 'fundamental_change', label: '基本面恶化',       score: 20 },
        { value: 'reallocation',       label: '资金调仓/更好机会', score: 20 },
        { value: 'partial_profit',     label: '部分止盈',         score: 15 },
        { value: 'other',              label: '其他原因',         score: 5  },
      ]),
      hint: '选择最符合本次卖出的主要原因',
      orderIndex: 1,
    },
    {
      direction: 'SELL' as const,
      questionKey: 'plan_execution',
      questionText: '计划执行度',
      questionType: 'SCORE' as const,
      maxScore: 20,
      hint: '本次卖出是否按照买入时制定的止盈止损计划执行？',
      orderIndex: 2,
    },
    {
      direction: 'SELL' as const,
      questionKey: 'fundamental_change_analysis',
      questionText: '基本面变化评估',
      questionType: 'SCORE' as const,
      maxScore: 15,
      hint: '对相比买入时基本面变化的分析是否充分？',
      orderIndex: 3,
    },
    {
      direction: 'SELL' as const,
      questionKey: 'sell_emotion_stability',
      questionText: '情绪稳定性',
      questionType: 'SCORE' as const,
      maxScore: 15,
      hint: '反向评分：卖出决策是否受到恐慌/贪婪等情绪驱动？',
      orderIndex: 4,
    },
    {
      direction: 'SELL' as const,
      questionKey: 'opportunity_cost',
      questionText: '机会成本分析',
      questionType: 'SCORE' as const,
      maxScore: 10,
      hint: '是否认真比较过继续持有与卖出的利弊？',
      orderIndex: 5,
    },
    {
      direction: 'SELL' as const,
      questionKey: 'timing_basis',
      questionText: '卖出时机依据',
      questionType: 'SCORE' as const,
      maxScore: 10,
      hint: '对卖出时机的选择是否有充分的依据（不是随机/随感觉）？',
      orderIndex: 6,
    },
    {
      direction: 'SELL' as const,
      questionKey: 'review_intent',
      questionText: '复盘意愿',
      questionType: 'BOOL' as const,
      maxScore: 5,
      hint: '是否愿意在平仓后完成详细的交易复盘？',
      orderIndex: 7,
    },
  ]

  await db.insert(questionnaireTemplates).values([...buyTemplates, ...sellTemplates])

  // ── 6. 标记 setup 已完成 ──────────────────────────────────────
  await db
    .insert(systemConfig)
    .values({ key: 'setup_completed', value: 'true' })
    .onConflictDoUpdate({
      target: systemConfig.key,
      set: { value: 'true', updatedAt: new Date() },
    })

  return c.json({
    ok: true,
    message: 'Setup completed successfully',
    admin: username.toLowerCase().trim(),
    templatesSeeded: buyTemplates.length + sellTemplates.length,
  })
})

export { router as setupRouter }
