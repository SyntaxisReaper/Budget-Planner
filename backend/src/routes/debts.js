import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/debts
router.get('/', async (req, res) => {
  const { kind } = req.query;
  let query = supabase
    .from('debts')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (kind) {
    query = query.eq('kind', kind);
  }

  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
});

// POST /api/debts
router.post('/', async (req, res) => {
  const { name, principal, debt_date, kind, interest_rate, min_payment, description, priority } = req.body;
  
  if (!name || principal == null) {
    return res.status(400).json({ error: 'name and principal are required' });
  }
  if (Number(principal) <= 0) {
    return res.status(400).json({ error: 'principal must be greater than 0' });
  }
  if (min_payment != null && Number(min_payment) < 0) {
    return res.status(400).json({ error: 'min_payment cannot be negative' });
  }
  if (kind && !['debt', 'rent'].includes(kind)) {
    return res.status(400).json({ error: 'kind must be debt or rent' });
  }

  const { data, error } = await supabase
    .from('debts')
    .insert({
      user_id: req.userId,
      name,
      principal,
      remaining_balance: principal,
      debt_date: debt_date || null,
      kind: kind || 'debt',
      interest_rate: interest_rate ?? null,
      min_payment: min_payment ?? null,
      status: 'active',
      description: description ?? null,
      priority: priority ?? 'normal',
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// PUT /api/debts/:id
router.put('/:id', async (req, res) => {
  const { name, debt_date, kind, interest_rate, min_payment, status, description, priority } = req.body;
  
  if (min_payment != null && Number(min_payment) < 0) {
    return res.status(400).json({ error: 'min_payment cannot be negative' });
  }
  if (kind && !['debt', 'rent'].includes(kind)) {
    return res.status(400).json({ error: 'kind must be debt or rent' });
  }

  const { data, error } = await supabase
    .from('debts')
    .update({ 
      name, 
      debt_date, 
      kind, 
      interest_rate, 
      min_payment, 
      status, 
      description, 
      priority: priority ?? 'normal' 
    })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Debt not found' });
  res.json(data);
});

// DELETE /api/debts/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

// GET /api/debts/:id/payments
router.get('/:id/payments', async (req, res) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, accounts(name, type)')
    .eq('debt_id', req.params.id)
    .eq('type', 'debt_payment')
    .eq('user_id', req.userId)
    .order('occurred_at', { ascending: false });

  if (error) throw error;
  res.json(data);
});

export default router;
