-- ============================================================
-- Smart Budget Manager — Initial Schema
-- Run this in your Supabase SQL Editor (or as a migration)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── income_sources ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS income_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL,
  frequency   TEXT NOT NULL CHECK (frequency IN ('monthly', 'weekly', 'one-time')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their income_sources"
  ON income_sources FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── items ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  amount_needed  NUMERIC(12, 2) NOT NULL,
  priority       TEXT NOT NULL CHECK (priority IN ('essential', 'important', 'optional')),
  is_recurring   BOOLEAN DEFAULT false,
  due_date       DATE,
  created_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their items"
  ON items FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── transactions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id  UUID REFERENCES items(id) ON DELETE SET NULL,
  amount   NUMERIC(12, 2) NOT NULL,
  type     TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date     DATE NOT NULL,
  note     TEXT
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their transactions"
  ON transactions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── debts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  principal         NUMERIC(12, 2) NOT NULL,
  remaining_balance NUMERIC(12, 2) NOT NULL,
  interest_rate     NUMERIC(5, 2),
  min_payment       NUMERIC(12, 2),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off')),
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their debts"
  ON debts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── debt_payments ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debt_payments (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id  UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount   NUMERIC(12, 2) NOT NULL,
  date     DATE NOT NULL
);
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their debt_payments via debts"
  ON debt_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM debts d
      WHERE d.id = debt_payments.debt_id
        AND d.user_id = auth.uid()
    )
  );

-- ─── goals ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  target_amount   NUMERIC(12, 2) NOT NULL,
  current_amount  NUMERIC(12, 2) DEFAULT 0,
  target_date     DATE
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their goals"
  ON goals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── budgets ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month            DATE NOT NULL,  -- first-of-month convention
  total_income     NUMERIC(12, 2) NOT NULL,
  total_allocated  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_saved      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  UNIQUE (user_id, month)
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their budgets"
  ON budgets FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── budget_allocations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_allocations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id        UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  target_type      TEXT NOT NULL CHECK (target_type IN ('item', 'debt', 'goal')),
  target_id        UUID NOT NULL,
  allocated_amount NUMERIC(12, 2) NOT NULL,
  spent_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0
);
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their budget_allocations via budgets"
  ON budget_allocations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_allocations.budget_id
        AND b.user_id = auth.uid()
    )
  );
