-- Add description to debts
ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create user_settings table for flexible budget cycles
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance NUMERIC(12, 2) DEFAULT 0,
  cycle_income NUMERIC(12, 2) DEFAULT 0,
  cycle_start_date DATE DEFAULT CURRENT_DATE,
  cycle_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their settings"
  ON user_settings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add is_manual to budget_allocations
ALTER TABLE budget_allocations
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;
