import { Hono } from 'hono'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { positions, tradeRecords, questionnaires } from '../db/schema'
import { eq, and, sql, count, avg, sum } from 'drizzle-orm'
import type { HonoBindings, HonoVariables } from '../types'

export const statsRouter = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>()

statsRouter.get('/', async (c) => {
  const db     = drizzle(neon(c.env.DATABASE_URL))
  const userId = c.get('userId')

  // 并行查询，减少往返次数
  const [
    positionCounts,
    tradeCounts,
    scoreResult,
    winRateResult,
    pnlResult,
    investedResult,
  ] = await Promise.all([
    // 持仓数量（OPEN + 总计）
    db
      .select({
        status: positions.status,
        cnt:    count(),
      })
      .from(positions)
      .where(eq(positions.userId, userId))
      .groupBy(positions.status),

    // 总交易次数
    db
      .select({ cnt: count() })
      .from(tradeRecords)
      .innerJoin(positions, eq(tradeRecords.positionId, positions.id))
      .where(eq(positions.userId, userId)),

    // 平均决策分（所有问卷）
    db
      .select({ avgScore: avg(questionnaires.totalScore) })
      .from(questionnaires)
      .innerJoin(tradeRecords, eq(questionnaires.tradeId, tradeRecords.id))
      .innerJoin(positions, eq(tradeRecords.positionId, positions.id))
      .where(eq(positions.userId, userId)),

    // 胜率：已平仓中 realized_pnl > 0 的比例
    db
      .select({
        total:   count(),
        winners: sql<number>`COUNT(*) FILTER (WHERE ${positions.realizedPnl}::numeric > 0)`,
      })
      .from(positions)
      .where(and(eq(positions.userId, userId), eq(positions.status, 'CLOSED'))),

    // 已实现总收益
    db
      .select({ total: sum(positions.realizedPnl) })
      .from(positions)
      .where(and(eq(positions.userId, userId), eq(positions.status, 'CLOSED'))),

    // 当前开仓总投入
    db
      .select({ total: sum(positions.totalInvested) })
      .from(positions)
      .where(and(eq(positions.userId, userId), eq(positions.status, 'OPEN'))),
  ])

  const openCount  = positionCounts.find(r => r.status === 'OPEN')?.cnt  ?? 0
  const closedCount = positionCounts.find(r => r.status === 'CLOSED')?.cnt ?? 0
  const totalCount = openCount + closedCount

  const { total: closedTotal, winners } = winRateResult[0] ?? { total: 0, winners: 0 }
  const winRate = closedTotal > 0 ? (Number(winners) / Number(closedTotal)) * 100 : null

  return c.json({
    openPositionsCount:  Number(openCount),
    totalPositionsCount: Number(totalCount),
    totalTrades:         Number(tradeCounts[0]?.cnt ?? 0),
    avgDecisionScore:    scoreResult[0]?.avgScore != null ? Math.round(Number(scoreResult[0].avgScore)) : null,
    winRate:             winRate != null ? Math.round(winRate * 10) / 10 : null,
    totalRealizedPnl:    pnlResult[0]?.total ?? null,
    totalInvested:       investedResult[0]?.total ?? null,
  })
})
