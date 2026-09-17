-- 0. Wipe existing dummy data for a fresh start
TRUNCATE TABLE budget_allocations, budgets, goals, debts, transactions, items, income_sources, user_settings CASCADE;

-- 1. Create accounts
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('bank', 'cash')),
  last4           TEXT,
  current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their accounts"
  ON accounts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Drop old tables
DROP TABLE IF EXISTS debt_payments CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;

-- 3. Create transactions
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer_in', 'transfer_out', 'debt_payment', 'goal_contribution')),
  amount           NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  occurred_at      TIMESTAMPTZ NOT NULL,
  item_id          UUID REFERENCES items(id) ON DELETE SET NULL,
  debt_id          UUID REFERENCES debts(id) ON DELETE SET NULL,
  goal_id          UUID REFERENCES goals(id) ON DELETE SET NULL,
  transfer_pair_id UUID,
  utr_id           TEXT,
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "transactions_debt_id_check" CHECK ((type = 'debt_payment' AND debt_id IS NOT NULL) OR type != 'debt_payment'),
  CONSTRAINT "transactions_goal_id_check" CHECK ((type = 'goal_contribution' AND goal_id IS NOT NULL) OR type != 'goal_contribution')
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their transactions"
  ON transactions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Extend debts
ALTER TABLE debts
ADD COLUMN IF NOT EXISTS debt_date DATE,
ADD COLUMN IF NOT EXISTS kind TEXT CHECK (kind IN ('debt', 'rent')) DEFAULT 'debt';

-- 5. Create the Balance Engine Trigger
CREATE OR REPLACE FUNCTION update_balances_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Accounts Update
    IF NEW.type = 'income' OR NEW.type = 'transfer_in' THEN
      UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type IN ('expense', 'transfer_out', 'debt_payment', 'goal_contribution') THEN
      UPDATE accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
    END IF;

    -- Debts Update
    IF NEW.type = 'debt_payment' THEN
      UPDATE debts SET remaining_balance = remaining_balance - NEW.amount WHERE id = NEW.debt_id;
      UPDATE debts SET status = 'paid_off' WHERE id = NEW.debt_id AND remaining_balance <= 0;
    END IF;

    -- Goals Update
    IF NEW.type = 'goal_contribution' THEN
      UPDATE goals SET current_amount = current_amount + NEW.amount WHERE id = NEW.goal_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- Accounts Revert
    IF OLD.type = 'income' OR OLD.type = 'transfer_in' THEN
      UPDATE accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type IN ('expense', 'transfer_out', 'debt_payment', 'goal_contribution') THEN
      UPDATE accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
    END IF;

    -- Debts Revert
    IF OLD.type = 'debt_payment' THEN
      UPDATE debts SET remaining_balance = remaining_balance + OLD.amount WHERE id = OLD.debt_id;
      UPDATE debts SET status = 'active' WHERE id = OLD.debt_id AND remaining_balance > 0;
    END IF;

    -- Goals Revert
    IF OLD.type = 'goal_contribution' THEN
      UPDATE goals SET current_amount = current_amount - OLD.amount WHERE id = OLD.goal_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_balance_trigger
AFTER INSERT OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_balances_on_transaction();

-- 6. Create RPC for Transfers
CREATE OR REPLACE FUNCTION transfer_between_accounts(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_utr_id TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT now()
) RETURNS UUID AS $$
DECLARE
  v_pair_id UUID;
  v_user_id UUID;
BEGIN
  -- Get user_id from from_account
  SELECT user_id INTO v_user_id FROM accounts WHERE id = p_from_account_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'From account not found or not owned by user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_to_account_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'To account not found or not owned by user';
  END IF;

  v_pair_id := gen_random_uuid();

  INSERT INTO transactions (user_id, account_id, type, amount, occurred_at, transfer_pair_id, utr_id, note)
  VALUES (v_user_id, p_from_account_id, 'transfer_out', p_amount, p_occurred_at, v_pair_id, p_utr_id, p_note);

  INSERT INTO transactions (user_id, account_id, type, amount, occurred_at, transfer_pair_id, utr_id, note)
  VALUES (v_user_id, p_to_account_id, 'transfer_in', p_amount, p_occurred_at, v_pair_id, p_utr_id, p_note);

  RETURN v_pair_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
