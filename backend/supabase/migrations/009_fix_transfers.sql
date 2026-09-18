-- Fix transfer_between_accounts to accept p_user_id and drop the auth.uid() dependency

DROP FUNCTION IF EXISTS transfer_between_accounts(UUID, UUID, NUMERIC, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION transfer_between_accounts(
  p_user_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_utr_id TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT now()
) RETURNS UUID AS $$
DECLARE
  v_pair_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_from_account_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'From account not found or not owned by user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_to_account_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'To account not found or not owned by user';
  END IF;

  v_pair_id := gen_random_uuid();

  INSERT INTO transactions (user_id, account_id, type, amount, occurred_at, transfer_pair_id, utr_id, note)
  VALUES (p_user_id, p_from_account_id, 'transfer_out', p_amount, p_occurred_at, v_pair_id, p_utr_id, p_note);

  INSERT INTO transactions (user_id, account_id, type, amount, occurred_at, transfer_pair_id, utr_id, note)
  VALUES (p_user_id, p_to_account_id, 'transfer_in', p_amount, p_occurred_at, v_pair_id, p_utr_id, p_note);

  RETURN v_pair_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
