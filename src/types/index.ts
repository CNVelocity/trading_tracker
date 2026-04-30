export type Market = 'A_SHARE' | 'HK' | 'US' | 'ETF' | 'OTHER'
export type Direction = 'BUY' | 'SELL'
export type PositionStatus = 'OPEN' | 'CLOSED'
export type Currency = 'CNY' | 'HKD' | 'USD'
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'
export type QuestionType = 'SCORE' | 'BOOL' | 'TEXT' | 'SELECT'

export interface Position {
  id: string
  ticker: string
  name: string | null
  market: Market
  currency: Currency
  status: PositionStatus
  openedAt: string
  closedAt: string | null
  tags: string[] | null
  notes: string | null
  avgCost: string | null
  currentQuantity: number | null
  totalInvested: string | null
  realizedPnl: string | null
  createdAt: string
  updatedAt: string
}

export interface TradeRecord {
  id: string
  positionId: string
  direction: Direction
  tradeDate: string
  price: string
  quantity: number
  commission: string | null
  currency: Currency
  totalAmount: string | null
  notes: string | null
  createdAt: string
}

export interface SelectOption {
  value: string
  label: string
  score: number
}

export interface QuestionnaireTemplate {
  id: string
  direction: Direction | null
  questionKey: string
  questionText: string
  questionType: QuestionType
  options: string | null
  maxScore: number | null
  weight: string | null
  hint: string | null
  orderIndex: number
  isActive: boolean
}

export interface QuestionAnswer {
  score?: number
  text?: string
  selected?: string
  boolValue?: boolean
}

export type AnswerMap = Record<string, QuestionAnswer>

export interface Questionnaire {
  id: string
  tradeId: string
  direction: Direction
  answers: string
  totalScore: number
  grade: Grade
  completedAt: string
  createdAt: string
}

export interface TradeReview {
  id: string
  positionId: string
  actualReturnPct: string | null
  holdDays: number | null
  whatWentRight: string | null
  whatWentWrong: string | null
  lessons: string | null
  wouldDoAgain: boolean | null
  outcomeScore: number | null
  reviewedAt: string
  createdAt: string
}

export interface WatchlistItem {
  id: string
  ticker: string
  name: string | null
  market: Market
  currency: Currency | null
  targetBuyPrice: string | null
  reason: string | null
  priority: string | null
  removedAt: string | null
  notes: string | null
  createdAt: string
}

export interface PositionWithTrades extends Position {
  trades: TradeRecord[]
}
