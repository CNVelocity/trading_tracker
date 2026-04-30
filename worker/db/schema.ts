import {
  pgTable, pgEnum, uuid, varchar, text,
  integer, boolean, date, timestamp, numeric,
} from 'drizzle-orm/pg-core'

export const marketTypeEnum = pgEnum('market_type', ['A_SHARE', 'HK', 'US', 'ETF', 'OTHER'])
export const directionTypeEnum = pgEnum('direction_type', ['BUY', 'SELL'])
export const positionStatusEnum = pgEnum('position_status', ['OPEN', 'CLOSED'])
export const currencyTypeEnum = pgEnum('currency_type', ['CNY', 'HKD', 'USD'])
export const gradeTypeEnum = pgEnum('grade_type', ['S', 'A', 'B', 'C', 'D'])
export const questionTypeEnum = pgEnum('question_type', ['SCORE', 'BOOL', 'TEXT', 'SELECT'])

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }),
  market: marketTypeEnum('market').notNull(),
  currency: currencyTypeEnum('currency').notNull().default('CNY'),
  status: positionStatusEnum('status').notNull().default('OPEN'),
  openedAt: date('opened_at').notNull(),
  closedAt: date('closed_at'),
  tags: text('tags').array(),
  notes: text('notes'),
  // Aggregated fields — updated after every trade
  avgCost: numeric('avg_cost', { precision: 12, scale: 4 }),
  currentQuantity: integer('current_quantity').default(0),
  totalInvested: numeric('total_invested', { precision: 14, scale: 4 }).default('0'),
  realizedPnl: numeric('realized_pnl', { precision: 14, scale: 4 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tradeRecords = pgTable('trade_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  positionId: uuid('position_id').notNull().references(() => positions.id, { onDelete: 'cascade' }),
  direction: directionTypeEnum('direction').notNull(),
  tradeDate: date('trade_date').notNull(),
  price: numeric('price', { precision: 12, scale: 4 }).notNull(),
  quantity: integer('quantity').notNull(),
  commission: numeric('commission', { precision: 10, scale: 4 }).default('0'),
  currency: currencyTypeEnum('currency').notNull().default('CNY'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 4 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const questionnaireTemplates = pgTable('questionnaire_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  direction: directionTypeEnum('direction'),
  questionKey: varchar('question_key', { length: 50 }).notNull().unique(),
  questionText: text('question_text').notNull(),
  questionType: questionTypeEnum('question_type').notNull(),
  options: text('options'), // JSON string: [{value, label, score}]
  maxScore: integer('max_score').default(10),
  weight: numeric('weight', { precision: 4, scale: 2 }).default('1.0'),
  hint: text('hint'),
  orderIndex: integer('order_index').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const questionnaires = pgTable('questionnaires', {
  id: uuid('id').primaryKey().defaultRandom(),
  tradeId: uuid('trade_id').notNull().unique().references(() => tradeRecords.id, { onDelete: 'cascade' }),
  direction: directionTypeEnum('direction').notNull(),
  answers: text('answers').notNull(), // JSON string: {questionKey: {score?, text?, selected?, boolValue?}}
  totalScore: integer('total_score').notNull(),
  grade: gradeTypeEnum('grade').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tradeReviews = pgTable('trade_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  positionId: uuid('position_id').notNull().unique().references(() => positions.id, { onDelete: 'cascade' }),
  actualReturnPct: numeric('actual_return_pct', { precision: 8, scale: 4 }),
  holdDays: integer('hold_days'),
  whatWentRight: text('what_went_right'),
  whatWentWrong: text('what_went_wrong'),
  lessons: text('lessons'),
  wouldDoAgain: boolean('would_do_again'),
  outcomeScore: integer('outcome_score'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const watchlist = pgTable('watchlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }),
  market: marketTypeEnum('market').notNull(),
  currency: currencyTypeEnum('currency').default('CNY'),
  targetBuyPrice: numeric('target_buy_price', { precision: 12, scale: 4 }),
  reason: text('reason'),
  priority: varchar('priority', { length: 10 }).default('MEDIUM'),
  removedAt: timestamp('removed_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
