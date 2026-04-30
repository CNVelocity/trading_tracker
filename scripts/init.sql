-- ============================================================
--  Trading Tracker — Neon Database Init Script
--  粘贴到 Neon SQL Editor 全选执行即可
--  顺序：Enums → Tables（按外键依赖顺序）
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────
CREATE TYPE market_type     AS ENUM ('A_SHARE', 'HK', 'US', 'ETF', 'OTHER');
CREATE TYPE direction_type  AS ENUM ('BUY', 'SELL');
CREATE TYPE position_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE currency_type   AS ENUM ('CNY', 'HKD', 'USD');
CREATE TYPE grade_type      AS ENUM ('S', 'A', 'B', 'C', 'D');
CREATE TYPE question_type   AS ENUM ('SCORE', 'BOOL', 'TEXT', 'SELECT');
CREATE TYPE user_role       AS ENUM ('ADMIN', 'USER');

-- ── users ─────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  NOT NULL UNIQUE,
  display_name  VARCHAR(100) NOT NULL,
  password_hash TEXT         NOT NULL,
  password_salt TEXT         NOT NULL,
  role          user_role    NOT NULL DEFAULT 'USER',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── positions ─────────────────────────────────────────────────
CREATE TABLE positions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ticker           VARCHAR(20)     NOT NULL,
  name             VARCHAR(100),
  market           market_type     NOT NULL,
  currency         currency_type   NOT NULL DEFAULT 'CNY',
  status           position_status NOT NULL DEFAULT 'OPEN',
  opened_at        DATE            NOT NULL,
  closed_at        DATE,
  tags             TEXT[],
  notes            TEXT,
  avg_cost         NUMERIC(12, 4),
  current_quantity INTEGER          DEFAULT 0,
  total_invested   NUMERIC(14, 4)   DEFAULT 0,
  realized_pnl     NUMERIC(14, 4)   DEFAULT 0,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_status  ON positions(status);
CREATE INDEX idx_positions_ticker  ON positions(ticker);

-- ── trade_records ─────────────────────────────────────────────
CREATE TABLE trade_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id  UUID           NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  direction    direction_type NOT NULL,
  trade_date   DATE           NOT NULL,
  price        NUMERIC(12, 4) NOT NULL,
  quantity     INTEGER        NOT NULL,
  commission   NUMERIC(10, 4) DEFAULT 0,
  currency     currency_type  NOT NULL DEFAULT 'CNY',
  total_amount NUMERIC(14, 4),
  notes        TEXT,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_records_position_id ON trade_records(position_id);
CREATE INDEX idx_trade_records_trade_date  ON trade_records(trade_date);

-- ── questionnaire_templates ───────────────────────────────────
CREATE TABLE questionnaire_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction     direction_type,
  question_key  VARCHAR(50) NOT NULL UNIQUE,
  question_text TEXT        NOT NULL,
  question_type question_type NOT NULL,
  options       TEXT,
  max_score     INTEGER     DEFAULT 10,
  weight        NUMERIC(4, 2) DEFAULT 1.0,
  hint          TEXT,
  order_index   INTEGER     NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── questionnaires ────────────────────────────────────────────
CREATE TABLE questionnaires (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id     UUID           NOT NULL UNIQUE REFERENCES trade_records(id) ON DELETE CASCADE,
  direction    direction_type NOT NULL,
  answers      TEXT           NOT NULL,
  total_score  INTEGER        NOT NULL,
  grade        grade_type     NOT NULL,
  completed_at TIMESTAMPTZ    NOT NULL,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── trade_reviews ─────────────────────────────────────────────
CREATE TABLE trade_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id       UUID        NOT NULL UNIQUE REFERENCES positions(id) ON DELETE CASCADE,
  actual_return_pct NUMERIC(8, 4),
  hold_days         INTEGER,
  what_went_right   TEXT,
  what_went_wrong   TEXT,
  lessons           TEXT,
  would_do_again    BOOLEAN,
  outcome_score     INTEGER,
  reviewed_at       TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── watchlist ─────────────────────────────────────────────────
CREATE TABLE watchlist (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ticker           VARCHAR(20)   NOT NULL,
  market           market_type   NOT NULL,
  name             VARCHAR(100),
  target_buy_price NUMERIC(12, 4),
  reason           TEXT,
  priority         VARCHAR(6)    DEFAULT 'MED',
  notes            TEXT,
  added_at         DATE          NOT NULL,
  removed_at       DATE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_watchlist_user_id    ON watchlist(user_id);
CREATE INDEX idx_watchlist_removed_at ON watchlist(removed_at);

-- ── system_config（标记 setup 完成状态）──────────────────────
CREATE TABLE system_config (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT         NOT NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
