-- 1a. Extend the `people` table
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS phone      TEXT,
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS birthday   DATE;

-- 1b. Add `person_id` to `debts`
ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;
  
ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'borrowed'
    CHECK (direction IN ('borrowed', 'lent'));

-- 1c. Add `debt_id` to `transactions`
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES debts(id) ON DELETE SET NULL;

-- 1d. Add a `contacts_import_log` table
CREATE TABLE IF NOT EXISTS contacts_import_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imported_at TIMESTAMPTZ DEFAULT now(),
  total       INT,
  created     INT,
  updated     INT,
  skipped     INT
);
ALTER TABLE contacts_import_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own import logs" ON contacts_import_log;
CREATE POLICY "Users own import logs" ON contacts_import_log FOR ALL USING (user_id = auth.uid());

-- 2. Data migration from people_ledger to debts
INSERT INTO debts (user_id, name, principal, remaining_balance, direction, person_id, status, created_at, kind)
SELECT
  pl.user_id,
  COALESCE(p.name, 'Unknown Contact') AS name,
  pl.amount AS principal,
  pl.amount AS remaining_balance,
  pl.direction,
  pl.person_id,
  CASE WHEN pl.status = 'settled' THEN 'paid_off' ELSE 'active' END,
  pl.created_at,
  'debt'
FROM people_ledger pl
LEFT JOIN people p ON p.id = pl.person_id
WHERE pl.user_id IS NOT NULL;
