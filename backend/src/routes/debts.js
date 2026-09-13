import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { calculateDebtProjection } from '../services/debtService.js';

const router = Router();
router.use(authenticate);

// GET /api/debts
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json(data);
});

// POST /api/debts
router.post('/', async (req, res) => {
  const { name, principal, interest_rate, min_payment, description, priority } = req.body;
  if (!name || principal == null) {
    return res.status(400).json({ error: 'name and principal are required' });
  }

  const { data, error } = await supabase
    .from('debts')
    .insert({
      user_id: req.userId,
      name,
      principal,
      remaining_balance: principal,
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
  const { name, interest_rate, min_payment, status, description, priority } = req.body;
  const { data, error } = await supabase
    .from('debts')
    .update({ name, interest_rate, min_payment, status, description, priority: priority ?? 'normal' })
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

// POST /api/debts/:id/payments
router.post('/:id/payments', async (req, res) => {
  const { amount, date } = req.body;
  if (amount == null || !date) {
    return res.status(400).json({ error: 'amount and date are required' });
  }

  // Verify debt belongs to user
  const { data: debt, error: debtErr } = await supabase
    .from('debts')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (debtErr || !debt) return res.status(404).json({ error: 'Debt not found' });

  // Insert payment
  const { data: payment, error: payErr } = await supabase
    .from('debt_payments')
    .insert({ debt_id: req.params.id, amount, date })
    .select()
    .single();

  if (payErr) throw payErr;

  // Recalculate remaining balance
  const newBalance = Math.max(0, Number(debt.remaining_balance) - Number(amount));
  const newStatus = newBalance === 0 ? 'paid_off' : 'active';

  const { data: updatedDebt, error: updateErr } = await supabase
    .from('debts')
    .update({ remaining_balance: newBalance, status: newStatus })
    .eq('id', req.params.id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Subtract payment from user_settings current_balance
  const { data: settings } = await supabase
    .from('user_settings')
    .select('id, current_balance')
    .eq('user_id', req.userId)
    .single();

  if (settings) {
    await supabase
      .from('user_settings')
      .update({ current_balance: Number(settings.current_balance || 0) - Number(amount) })
      .eq('id', settings.id);
  }

  res.status(201).json({ payment, debt: updatedDebt });
});

// GET /api/debts/:id/projection
router.get('/:id/projection', async (req, res) => {
  const { data: debt, error } = await supabase
    .from('debts')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !debt) return res.status(404).json({ error: 'Debt not found' });

  // Get all active debts to compute equal distribution pool from last budget
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, total_income, month')
    .eq('user_id', req.userId)
    .order('month', { ascending: false })
    .limit(1);

  let monthlyPayment = debt.min_payment || 0;

  if (budgets && budgets.length > 0) {
    const { data: activeDebts } = await supabase
      .from('debts')
      .select('id, min_payment')
      .eq('user_id', req.userId)
      .eq('status', 'active');

    const allocation = await supabase
      .from('budget_allocations')
      .select('allocated_amount')
      .eq('budget_id', budgets[0].id)
      .eq('target_type', 'debt')
      .eq('target_id', req.params.id)
      .single();

    if (allocation.data) {
      monthlyPayment = Number(allocation.data.allocated_amount);
    }
  }

  const projection = calculateDebtProjection(debt, monthlyPayment);
  res.json(projection);
});

export default router;
