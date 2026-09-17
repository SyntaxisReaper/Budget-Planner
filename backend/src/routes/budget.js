import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { computeCycleBounds } from '../utils/dateUtils.js';

const router = Router();
router.use(authenticate);

// GET /api/budget/:month
router.get('/:month', async (req, res) => {
  const firstOfMonth = `${req.params.month}-01`;

  // Fetch the budget
  let { data: budget, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', req.userId)
    .eq('month', firstOfMonth)
    .single();

  if (error || !budget) {
    // Return empty state if no budget exists
    return res.json({ month: firstOfMonth, allocations: [] });
  }

  // Fetch allocations
  const { data: allocations, error: allocErr } = await supabase
    .from('budget_allocations')
    .select('*')
    .eq('budget_id', budget.id)
    .order('target_type');

  if (allocErr) throw allocErr;

  // Compute live spent_amount for each allocation by summing transactions in the cycle
  const { data: settings } = await supabase
    .from('user_settings')
    .select('cycle_start_date, cycle_days')
    .eq('user_id', req.userId)
    .single();

  const { start, end } = computeCycleBounds(req.params.month, settings);

  const { data: txns } = await supabase
    .from('transactions')
    .select('item_id, debt_id, goal_id, type, amount')
    .eq('user_id', req.userId)
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  const spentMap = {};
  if (txns) {
    txns.forEach(t => {
      if (t.type === 'expense' && t.item_id) {
        spentMap[`item_${t.item_id}`] = (spentMap[`item_${t.item_id}`] || 0) + Number(t.amount);
      } else if (t.type === 'debt_payment' && t.debt_id) {
        spentMap[`debt_${t.debt_id}`] = (spentMap[`debt_${t.debt_id}`] || 0) + Number(t.amount);
      } else if (t.type === 'goal_contribution' && t.goal_id) {
        spentMap[`goal_${t.goal_id}`] = (spentMap[`goal_${t.goal_id}`] || 0) + Number(t.amount);
      }
    });
  }

  // Enrich with names and dynamic spent amounts
  const [itemIds, debtIds, goalIds] = [
    allocations.filter(a => a.target_type === 'item').map(a => a.target_id),
    allocations.filter(a => a.target_type === 'debt').map(a => a.target_id),
    allocations.filter(a => a.target_type === 'goal').map(a => a.target_id),
  ];
  const [itemsR, debtsR, goalsR] = await Promise.all([
    itemIds.length ? supabase.from('items').select('id,name').in('id', itemIds) : { data: [] },
    debtIds.length ? supabase.from('debts').select('id,name').in('id', debtIds) : { data: [] },
    goalIds.length ? supabase.from('goals').select('id,name').in('id', goalIds) : { data: [] },
  ]);
  
  const nameMap = {};
  [...(itemsR.data||[]), ...(debtsR.data||[]), ...(goalsR.data||[])].forEach(r => { nameMap[r.id] = r.name; });
  
  allocations.forEach(a => { 
    a.name = nameMap[a.target_id] || a.target_id;
    a.spent_amount = spentMap[`${a.target_type}_${a.target_id}`] || 0;
  });

  res.json({ ...budget, allocations });
});

// PUT /api/budget/:month/allocations/:target_type/:target_id
router.put('/:month/allocations/:target_type/:target_id', async (req, res) => {
  const { month, target_type, target_id } = req.params;
  const { allocated_amount } = req.body;
  const firstOfMonth = `${month}-01`;

  if (!['item', 'debt', 'goal'].includes(target_type)) {
    return res.status(400).json({ error: 'Invalid target_type' });
  }

  if (allocated_amount == null || Number(allocated_amount) < 0) {
    return res.status(400).json({ error: 'allocated_amount is required and must be non-negative' });
  }

  // Ensure budget exists
  let { data: budget } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', req.userId)
    .eq('month', firstOfMonth)
    .single();

  if (!budget) {
    // Create skeleton budget if it doesn't exist
    const { data: newBudget, error: budgetErr } = await supabase
      .from('budgets')
      .insert({
        user_id: req.userId,
        month: firstOfMonth,
        total_income: 0,
        total_allocated: 0,
        total_saved: 0,
      })
      .select()
      .single();
    if (budgetErr) throw budgetErr;
    budget = newBudget;
  }

  // Check if allocation exists
  const { data: existingAlloc } = await supabase
    .from('budget_allocations')
    .select('id')
    .eq('budget_id', budget.id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .single();

  let allocResult;
  if (existingAlloc) {
    const { data, error } = await supabase
      .from('budget_allocations')
      .update({ allocated_amount })
      .eq('id', existingAlloc.id)
      .select()
      .single();
    if (error) throw error;
    allocResult = data;
  } else {
    const { data, error } = await supabase
      .from('budget_allocations')
      .insert({
        budget_id: budget.id,
        target_type,
        target_id,
        allocated_amount
      })
      .select()
      .single();
    if (error) throw error;
    allocResult = data;
  }

  res.json(allocResult);
});

// DELETE /api/budget/:month/allocations/:target_type/:target_id
router.delete('/:month/allocations/:target_type/:target_id', async (req, res) => {
  const { month, target_type, target_id } = req.params;
  const firstOfMonth = `${month}-01`;

  const { data: budget } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', req.userId)
    .eq('month', firstOfMonth)
    .single();

  if (!budget) return res.status(404).json({ error: 'Budget not found' });

  const { error } = await supabase
    .from('budget_allocations')
    .delete()
    .eq('budget_id', budget.id)
    .eq('target_type', target_type)
    .eq('target_id', target_id);

  if (error) throw error;
  res.status(204).send();
});

export default router;
