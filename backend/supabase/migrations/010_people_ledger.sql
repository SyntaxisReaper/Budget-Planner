-- Create people_ledger table
CREATE TABLE IF NOT EXISTS people_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('borrowed', 'lent')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE people_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their people_ledger" ON people_ledger FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Allow anon to read people_ledger by ID" ON people_ledger FOR SELECT TO anon USING (true);
