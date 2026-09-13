-- Migration 005: Add debt priority
ALTER TABLE debts 
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' 
  CHECK (priority IN ('high', 'normal', 'low'));
