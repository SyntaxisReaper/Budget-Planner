import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/accounts
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json(data);
});

// POST /api/accounts
router.post('/', async (req, res) => {
  const { name, type, last4 } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }
  if (!['bank', 'cash'].includes(type)) {
    return res.status(400).json({ error: 'type must be bank or cash' });
  }

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: req.userId,
      name,
      type,
      last4: last4 || null
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res) => {
  const { name, type, last4, is_active, current_balance } = req.body;

  if (type && !['bank', 'cash'].includes(type)) {
    return res.status(400).json({ error: 'type must be bank or cash' });
  }

  const payload = { name, type, last4, is_active };
  if (current_balance !== undefined) {
    payload.current_balance = current_balance;
  }

  const { data, error } = await supabase
    .from('accounts')
    .update(payload)
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Account not found' });
  res.json(data);
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  // Check if transactions exist
  const { data: txs, error: txError } = await supabase
    .from('transactions')
    .select('id')
    .eq('account_id', id)
    .limit(1);

  if (txError) throw txError;

  if (txs && txs.length > 0) {
    // Soft delete
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', req.userId);

    if (updateError) throw updateError;
    return res.json({ message: 'Account soft-deleted (set to inactive) because it has transactions' });
  } else {
    // Hard delete
    const { error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (deleteError) throw deleteError;
    return res.json({ message: 'Account deleted' });
  }
});

// POST /api/accounts/:id/transfer
router.post('/:id/transfer', async (req, res) => {
  const { id: from_account_id } = req.params;
  const { to_account_id, amount, utr_id, note, occurred_at } = req.body;

  if (!to_account_id || !amount) {
    return res.status(400).json({ error: 'to_account_id and amount are required' });
  }

  const { data, error } = await supabase.rpc('transfer_between_accounts', {
    p_user_id: req.userId,
    p_from_account_id: from_account_id,
    p_to_account_id: to_account_id,
    p_amount: amount,
    p_utr_id: utr_id || null,
    p_note: note || null,
    p_occurred_at: occurred_at || new Date().toISOString()
  });

  if (error) throw error;
  res.json({ transfer_pair_id: data });
});

export default router;
