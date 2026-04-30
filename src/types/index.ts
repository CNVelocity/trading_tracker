export type MarketType = 'A_SHARE' | 'HK' | 'US' | 'ETF' | 'OTHER'
export type DirectionType = 'BUY' | 'SELL'
export type PositionStatus = 'OPEN' | 'CLOSED'
export type CurrencyType = 'CNY' | 'HKD' | 'USD'
export type GradeType = 'S' | 'A' | 'B' | 'C' | 'D'
export type QuestionType = 'SCORE' | 'BOOL' | 'TEXT' | 'SELECT'
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface Position {
  id: string
  ticker: string
  name?: string
  market: MarketType
  currency: CurrencyType
  status: PositionStatus
  openedAt: string
  closedAt?: string
  tags?: string[]
  notes?: string
  avgCost?: string
  currentQuantity?: number
  totalInvested?: string
  realizedPnl?: string
  createdAt: string
  updatedAt: string
}

export interface TradeRecord {
  id: string
  positionId: string
  direction: DirectionType
  tradeDate: string
  price: string
  quantity: number
  commission?: string
  currency: CurrencyType
  totalAmount?: string
  notes?: string
  createdAt: string
}

export interface QuestionOption {
  value: string
  label: string
  score: number
}

export interface QuestionnaireTemplate {
  id: string
  direction: DirectionType
  questionKey: string
  questionText: string
  questionType: QuestionType
  options?: QuestionOption[]
  maxScore: number
  weight: number
  hint?: string
  orderIndex: number
  isActive: boolean
}

export interface QuestionAnswer {
  score?: number
  text?: string
  selected?: string
}

export interface Questionnaire {
  id: string
  tradeId: string
  direction: DirectionType
  answers: Record<string, QuestionAnswer>
  totalScore: number
  grade: GradeType
  completedAt: string
}

export interface TradeReview {
  id: string
  positionId: string
  actualReturnPct?: string
  holdDays?: number
  whatWentRight?: string
  whatWentWrong?: string
  lessons?: string
  wouldDoAgain?: boolean
  outcomeScore?: number
  reviewedAt: string
}

export interface WatchlistItem {
  id: string
  ticker: string
  name?: string
  market: MarketType
  currency: CurrencyType
  targetBuyPrice?: string
  reason?: string
  priority: Priority
  removedAt?: string
  notes?: string
  createdAt: string
}

export interface DashboardStats {
  openPositionsCount: number
  avgDecisionScore: number | null
}
