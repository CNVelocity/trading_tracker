/**
 * seed.ts — populate questionnaire_templates with default BUY and SELL questions.
 * Run: bun run db:seed
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { questionnaireTemplates } from '../worker/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

const BUY_TEMPLATES = [
  {
    direction: 'BUY' as const,
    questionKey: 'fundamental_analysis',
    questionText: '基本面分析完整度',
    questionType: 'SCORE' as const,
    maxScore: 20,
    weight: '1.0',
    hint: '0 = 完全未分析；20 = 财务/竞争/护城河深度研究，有书面记录',
    orderIndex: 1,
  },
  {
    direction: 'BUY' as const,
    questionKey: 'valuation',
    questionText: '估值水平合理性',
    questionType: 'SCORE' as const,
    maxScore: 15,
    weight: '1.0',
    hint: '0 = 明显高估；15 = 相对历史或同业显著低估，有量化依据',
    orderIndex: 2,
  },
  {
    direction: 'BUY' as const,
    questionKey: 'position_sizing',
    questionText: '仓位管理合理性',
    questionType: 'SCORE' as const,
    maxScore: 15,
    weight: '1.0',
    hint: '是否符合资金管理计划？单股仓位是否超过预设上限？',
    orderIndex: 3,
  },
  {
    direction: 'BUY' as const,
    questionKey: 'stop_loss_plan',
    questionText: '止损计划完整性',
    questionType: 'SCORE' as const,
    maxScore: 15,
    weight: '1.0',
    hint: '是否设定明确止损价位及触发止损的逻辑依据？',
    orderIndex: 4,
  },
  {
    direction: 'BUY' as const,
    questionKey: 'technical_signal',
    questionText: '技术面信号支撑',
    questionType: 'SCORE' as const,
    maxScore: 10,
    weight: '1.0',
    hint: '趋势、支撑位、形态是否支持当前买入点？',
    orderIndex: 5,
  },
  {
    direction: 'BUY' as const,
    questionKey: 'catalyst',
    questionText: '近期催化剂明确性',
    questionType: 'SCORE' as const,
    maxScore: 10,
    weight: '1.0',
    hint: '是否有可预期的近期事件（财报/政策/产品发布）驱动价格？',
    orderIndex: 6,
  },
  {
    direction: 'BUY' as const,
    questionKey: 'target_price',
    questionText: '目标价位设定',
    questionType: 'SCORE' as const,
    maxScore: 10,
    weight: '1.0',
    hint: '是否有基于估值或技术分析的明确目标价，并有逻辑支撑？',
    orderIndex: 7,
  },
  {
    direction: 'BUY' as const,
    questionKey: 'emotion_stability_buy',
    questionText: '情绪稳定性',
    questionType: 'SCORE' as const,
    maxScore: 5,
    weight: '1.0',
    hint: '反向评分：决策是否完全理性？追涨/恐慌/FOMO 得 0，冷静分析得 5',
    orderIndex: 8,
  },
]

const SELL_TEMPLATES = [
  {
    direction: 'SELL' as const,
    questionKey: 'sell_reason',
    questionText: '卖出主因',
    questionType: 'SELECT' as const,
    options: [
      { value: 'target_reached', label: '达到目标价', score: 25 },
      { value: 'stop_loss', label: '触发止损', score: 25 },
      { value: 'fundamental_change', label: '基本面恶化', score: 20 },
      { value: 'rebalance', label: '调仓/换标的', score: 18 },
      { value: 'other', label: '其他原因', score: 10 },
    ],
    maxScore: 25,
    weight: '1.0',
    hint: '按计划执行的卖出（达目标、止损）得满分；情绪性卖出得低分',
    orderIndex: 1,
  },
  {
    direction: 'SELL' as const,
    questionKey: 'plan_execution',
    questionText: '计划执行度',
    questionType: 'SCORE' as const,
    maxScore: 20,
    weight: '1.0',
    hint: '本次卖出是否完全按照买入时制定的止盈/止损计划执行？',
    orderIndex: 2,
  },
  {
    direction: 'SELL' as const,
    questionKey: 'fundamental_change_eval',
    questionText: '基本面变化评估',
    questionType: 'SCORE' as const,
    maxScore: 15,
    weight: '1.0',
    hint: '相比买入时，是否对基本面变化做了充分深入的分析？',
    orderIndex: 3,
  },
  {
    direction: 'SELL' as const,
    questionKey: 'emotion_stability_sell',
    questionText: '情绪稳定性',
    questionType: 'SCORE' as const,
    maxScore: 15,
    weight: '1.0',
    hint: '反向评分：是否受恐慌/贪婪驱动？理性决策得 15，纯情绪驱动得 0',
    orderIndex: 4,
  },
  {
    direction: 'SELL' as const,
    questionKey: 'opportunity_cost',
    questionText: '机会成本分析',
    questionType: 'SCORE' as const,
    maxScore: 10,
    weight: '1.0',
    hint: '是否认真比较了继续持有 vs 卖出的预期收益与风险？',
    orderIndex: 5,
  },
  {
    direction: 'SELL' as const,
    questionKey: 'timing_basis',
    questionText: '卖出时机依据',
    questionType: 'SCORE' as const,
    maxScore: 10,
    weight: '1.0',
    hint: '选择此时卖出（而非更早/更晚）是否有充分的逻辑依据？',
    orderIndex: 6,
  },
  {
    direction: 'SELL' as const,
    questionKey: 'review_willingness',
    questionText: '平仓后复盘意愿',
    questionType: 'BOOL' as const,
    maxScore: 5,
    weight: '1.0',
    hint: '是否承诺在平仓后完成详细的交易复盘记录？',
    orderIndex: 7,
  },
]

async function main() {
  console.log('Seeding questionnaire templates...')
  await db
    .insert(questionnaireTemplates)
    .values([...BUY_TEMPLATES, ...SELL_TEMPLATES])
    .onConflictDoNothing()
  console.log(`✓ Inserted ${BUY_TEMPLATES.length} BUY + ${SELL_TEMPLATES.length} SELL templates`)
}

main().catch(console.error)
