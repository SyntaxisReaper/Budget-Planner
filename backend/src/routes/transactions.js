import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { computeCycleBounds } from '../utils/dateUtils.js';

const router = Router();
router.use(authenticate);

// GET /api/transactions
router.get('/', async (req, res) => {
  const { account_id, item_id, debt_id, goal_id, type, from, to, month } = req.query;

  let query = supabase
    .from('transactions')
    .select('*, items(name, priority), accounts(name, type), debts(name), goals(name)')
    .eq('user_id', req.userId)
    .order('occurred_at', { ascending: false });

  if (account_id) query = query.eq('account_id', account_id);
  if (item_id) query = query.eq('item_id', item_id);
  if (debt_id) query = query.eq('debt_id', debt_id);
  if (goal_id) query = query.eq('goal_id', goal_id);
  if (type) query = query.eq('type', type);
  if (from) query = query.gte('occurred_at', from);
  if (to) query = query.lte('occurred_at', to);

  if (month) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('cycle_start_date, cycle_days')
      .eq('user_id', req.userId)
      .single();

    const { start, end } = computeCycleBounds(month, settings);
    query = query.gte('occurred_at', start).lte('occurred_at', end);
  }

  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
});

// POST /api/transactions/bulk
router.post('/bulk', async (req, res) => {
  const transactions = req.body;
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Expected an array of transactions' });
  }

  const inserts = transactions.map(t => ({
    user_id: req.userId,
    account_id: t.account_id,
    type: t.type,
    amount: t.amount,
    occurred_at: t.occurred_at,
    note: t.note || null
  }));

  const { data, error } = await supabase
    .from('transactions')
    .insert(inserts)
    .select();

  if (error) throw error;
  res.status(201).json(data);
});

// POST /api/transactions
router.post('/', async (req, res) => {
  const { account_id, type, amount, occurred_at, item_id, debt_id, goal_id, utr_id, note } = req.body;

  if (!account_id || !type || amount == null || !occurred_at) {
    return res.status(400).json({ error: 'account_id, type, amount, and occurred_at are required' });
  }

  if (['transfer_in', 'transfer_out'].includes(type)) {
    return res.status(400).json({ error: 'Transfers must be created via the account transfer endpoint' });
  }

  if (type === 'debt_payment' && !debt_id) {
    return res.status(400).json({ error: 'debt_id is required for debt_payment' });
  }

  if (type === 'goal_contribution' && !goal_id) {
    return res.status(400).json({ error: 'goal_id is required for goal_contribution' });
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: req.userId,
      account_id,
      type,
      amount,
      occurred_at,
      item_id: item_id || null,
      debt_id: debt_id || null,
      goal_id: goal_id || null,
      utr_id: utr_id || null,
      note: note || null
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  // The database trigger will automatically reverse balances on delete
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.json({ message: 'Transaction deleted and balances reverted' });
});

export default router;
