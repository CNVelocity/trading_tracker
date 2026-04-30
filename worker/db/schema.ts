import {
  pgTable, pgEnum, uuid, varchar, text, integer,
  boolean, date, timestamp, numeric, jsonb,
} from 'drizzle-orm/pg-core'

// ── Enums ──────────────────────────────────────────────────────
export const marketEnum = pgEnum('market_type', ['A_SHARE', 'HK', 'US', 'ETF', 'OTHER'])
export const directionEnum = pgEnum('direction_type', ['BUY', 'SELL'])
export const positionStatusEnum = pgEnum('position_status', ['OPEN', 'CLOSED'])
export const currencyEnum = pgEnum('currency_type', ['CNY', 'HKD', 'USD'])
export const gradeEnum = pgEnum('grade_type', ['S', 'A', 'B', 'C', 'D'])
export const questionTypeEnum = pgEnum('question_type', ['SCORE', 'BOOL', 'TEXT', 'SELECT'])

// ── Positions ──────────────────────────────────────────────────
export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }),
  market: marketEnum('market').notNull(),
  currency: currencyEnum('currency').notNull().default('CNY'),
  status: positionStatusEnum('status').notNull().default('OPEN'),
  openedAt: date('opened_at').notNull(),
  closedAt: date('closed_at'),
  tags: text('tags').array(),
  notes: text('notes'),
  // Cached aggregates — updated on each trade write
  avgCost: numeric('avg_cost', { precision: 12, scale: 4 }),
  currentQuantity: integer('current_quantity').default(0),
  totalInvested: numeric('total_invested', { precision: 14, scale: 4 }).default('0'),
  realizedPnl: numeric('realized_pnl', { precision: 14, scale: 4 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ── Trade Records ──────────────────────────────────────────────
export const tradeRecords = pgTable('trade_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  positionId: uuid('position_id')
    .notNull()
    .references(() => positions.id, { onDelete: 'cascade' }),
  direction: directionEnum('direction').notNull(),
  tradeDate: date('trade_date').notNull(),
  price: numeric('price', { precision: 12, scale: 4 }).notNull(),
  quantity: integer('quantity').notNull(),
  commission: numeric('commission', { precision: 10, scale: 4 }).default('0'),
  currency: currencyEnum('currency').notNull().default('CNY'),
  // Computed server-side: price * quantity (buy adds commission, sell subtracts)
  totalAmount: numeric('total_amount', { precision: 14, scale: 4 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Questionnaire Templates ────────────────────────────────────
export const questionnaireTemplates = pgTable('questionnaire_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  direction: directionEnum('direction').notNull(),
  questionKey: varchar('question_key', { length: 50 }).notNull().unique(),
  questionText: text('question_text').notNull(),
  questionType: questionTypeEnum('question_type').notNull(),
  // For SELECT type: [{value, label, score}]
  options: jsonb('options'),
  maxScore: integer('max_score').default(10),
  weight: numeric('weight', { precision: 4, scale: 2 }).default('1.0'),
  hint: text('hint'),
  orderIndex: integer('order_index').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Questionnaires ─────────────────────────────────────────────
export const questionnaires = pgTable('questionnaires', {
  id: uuid('id').primaryKey().defaultRandom(),
  tradeId: uuid('trade_id')
    .notNull()
    .unique()
    .references(() => tradeRecords.id, { onDelete: 'cascade' }),
  direction: directionEnum('direction').notNull(),
  // {question_key: {score?, text?, selected?}}
  answers: jsonb('answers').notNull(),
  totalScore: integer('total_score').notNull(),
  grade: gradeEnum('grade').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Trade Reviews ──────────────────────────────────────────────
export const tradeReviews = pgTable('trade_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  positionId: uuid('position_id')
    .notNull()
    .unique()
    .references(() => positions.id, { onDelete: 'cascade' }),
  actualReturnPct: numeric('actual_return_pct', { precision: 8, scale: 4 }),
  holdDays: integer('hold_days'),
  whatWentRight: text('what_went_right'),
  whatWentWrong: text('what_went_wrong'),
  lessons: text('lessons'),
  wouldDoAgain: boolean('would_do_again'),
  outcomeScore: integer('outcome_score'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Watchlist ──────────────────────────────────────────────────
export const watchlist = pgTable('watchlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }),
  market: marketEnum('market').notNull(),
  currency: currencyEnum('currency').default('CNY'),
  targetBuyPrice: numeric('target_buy_price', { precision: 12, scale: 4 }),
  reason: text('reason'),
  priority: varchar('priority', { length: 10 }).default('MEDIUM'),
  removedAt: timestamp('removed_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Inferred Types ─────────────────────────────────────────────
export type Position = typeof positions.$inferSelect
export type NewPosition = typeof positions.$inferInsert
export type TradeRecord = typeof tradeRecords.$inferSelect
export type NewTradeRecord = typeof tradeRecords.$inferInsert
export type QuestionnaireTemplate = typeof questionnaireTemplates.$inferSelect
export type Questionnaire = typeof questionnaires.$inferSelect
export type NewQuestionnaire = typeof questionnaires.$inferInsert
export type TradeReview = typeof tradeReviews.$inferSelect
export type WatchlistItem = typeof watchlist.$inferSelect
export type NewWatchlistItem = typeof watchlist.$inferInsert
