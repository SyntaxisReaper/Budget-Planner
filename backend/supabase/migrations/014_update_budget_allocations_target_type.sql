-- 014_update_budget_allocations_target_type.sql

-- Drop the old constraint
ALTER TABLE budget_allocations DROP CONSTRAINT budget_allocations_target_type_check;

-- Re-add the constraint including 'subscription'
ALTER TABLE budget_allocations ADD CONSTRAINT budget_allocations_target_type_check CHECK (target_type IN ('item', 'debt', 'goal', 'subscription'));
