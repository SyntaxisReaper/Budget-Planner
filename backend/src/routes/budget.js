import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { runAllocator } from '../services/allocator.js';
import { computeCycleBounds } from '../utils/dateUtils.js';

const router = Router();
router.use(authenticate);

// POST /api/budget/allocate
router.post('/allocate', async (req, res) => {
  const { month, leftover_preference, manual_allocations = {} } = req.body;
  if (!month) return res.status(400).json({ error: 'month (YYYY-MM) is required' });
  if (leftover_preference && !['savings', 'debt'].includes(leftover_preference)) {
    return res.status(400).json({ error: 'leftover_preference must be savings or debt' });
  }

  const firstOfMonth = `${month}-01`;

  // Gather data
  const [incomeRes, itemsRes, debtsRes, goalsRes, settingsRes] = await Promise.all([
    supabase.from('income_sources').select('*').eq('user_id', req.userId).order('created_at'),
    supabase.from('items').select('*').eq('user_id', req.userId).order('priority').order('created_at'),
    supabase.from('debts').select('*').eq('user_id', req.userId).eq('status', 'active').order('priority').order('created_at'),
    supabase.from('goals').select('*').eq('user_id', req.userId).order('created_at'),
    supabase.from('user_settings').select('*').eq('user_id', req.userId).single(),
  ]);

  if (incomeRes.error) throw incomeRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (debtsRes.error) throw debtsRes.error;
  if (goalsRes.error) throw goalsRes.error;

  // Compute total monthly income
  let totalIncome = 0;
  if (settingsRes.data && settingsRes.data.cycle_income > 0) {
    totalIncome = Number(settingsRes.data.cycle_income);
  } else {
    totalIncome = incomeRes.data.reduce((sum, src) => {
      let monthly = Number(src.amount);
      if (src.frequency === 'weekly') monthly = monthly * 52 / 12;
      else if (src.frequency === 'one-time') monthly = 0; // not counted in recurring budget
      return sum + monthly;
    }, 0);
  }

  // Run the allocator
  const allocation = runAllocator({
    totalIncome,
    items: itemsRes.data,
    activeDebts: debtsRes.data,
    goals: goalsRes.data,
    leftoverPreference: leftover_preference || 'savings',
    month: firstOfMonth,
    manualAllocations: manual_allocations,
  });

  // Upsert budget row
  const { data: existingBudget } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', req.userId)
    .eq('month', firstOfMonth)
    .single();

  let budgetId;
  let spentMap = {};

  if (existingBudget) {
    await supabase
      .from('budgets')
      .update({
        total_income: totalIncome,
        total_allocated: allocation.totalAllocated,
        total_saved: allocation.totalSaved,
      })
      .eq('id', existingBudget.id);
    budgetId = existingBudget.id;

    // We no longer preserve old allocations because we will dynamically sum them
    // Delete old allocations
    await supabase.from('budget_allocations').delete().eq('budget_id', budgetId);
  } else {
    const { data: newBudget, error: budgetErr } = await supabase
      .from('budgets')
      .insert({
        user_id: req.userId,
        month: firstOfMonth,
        total_income: totalIncome,
        total_allocated: allocation.totalAllocated,
        total_saved: allocation.totalSaved,
      })
      .select()
      .single();

    if (budgetErr) throw budgetErr;
    budgetId = newBudget.id;
  }

  // Calculate live spent_amount from transactions inside this cycle
  const { start: cycleStart, end: cycleEnd } = computeCycleBounds(month, settingsRes.data);
  const { data: txns } = await supabase
    .from('transactions')
    .select('item_id, amount')
    .eq('user_id', req.userId)
    .eq('type', 'expense')
    .gte('date', cycleStart)
    .lte('date', cycleEnd);

  if (txns) {
    txns.forEach(t => {
      if (t.item_id) {
        const key = `item_${t.item_id}`;
        spentMap[key] = (spentMap[key] || 0) + Number(t.amount);
      }
    });
  }

  // Insert allocations
  if (allocation.lineItems.length > 0) {
    const rows = allocation.lineItems.map((li) => ({
      budget_id: budgetId,
      target_type: li.target_type,
      target_id: li.target_id,
      allocated_amount: li.allocated_amount,
      spent_amount: spentMap[`${li.target_type}_${li.target_id}`] || 0,
      is_manual: li.is_manual || false,
    }));

    const { error: allocErr } = await supabase.from('budget_allocations').insert(rows);
    if (allocErr) throw allocErr;
  }

  res.status(201).json({
    budget_id: budgetId,
    month: firstOfMonth,
    total_income: totalIncome,
    total_allocated: allocation.totalAllocated,
    total_saved: allocation.totalSaved,
    leftover: allocation.leftover,
    line_items: allocation.lineItems,
    at_risk_goals: allocation.atRiskGoals,
  });
});

// GET /api/budget/:month
router.get('/:month', async (req, res) => {
  const firstOfMonth = `${req.params.month}-01`;

  const { data: budget, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', req.userId)
    .eq('month', firstOfMonth)
    .single();

  if (error || !budget) return res.status(404).json({ error: 'Budget not found for this month' });

  const { data: allocations, error: allocErr } = await supabase
    .from('budget_allocations')
    .select('*')
    .eq('budget_id', budget.id)
    .order('target_type');

  if (allocErr) throw allocErr;

  // For any rows still missing a name (old data), resolve from source tables
  const missing = allocations.filter(a => !a.name);
  if (missing.length > 0) {
    const [itemIds, debtIds, goalIds] = [
      missing.filter(a => a.target_type === 'item').map(a => a.target_id),
      missing.filter(a => a.target_type === 'debt').map(a => a.target_id),
      missing.filter(a => a.target_type === 'goal').map(a => a.target_id),
    ];
    const [itemsR, debtsR, goalsR] = await Promise.all([
      itemIds.length ? supabase.from('items').select('id,name').in('id', itemIds) : { data: [] },
      debtIds.length ? supabase.from('debts').select('id,name').in('id', debtIds) : { data: [] },
      goalIds.length ? supabase.from('goals').select('id,name').in('id', goalIds) : { data: [] },
    ]);
    const nameMap = {};
    [...(itemsR.data||[]), ...(debtsR.data||[]), ...(goalsR.data||[])].forEach(r => { nameMap[r.id] = r.name; });
    allocations.forEach(a => { if (!a.name) a.name = nameMap[a.target_id] || a.target_id; });
  }

  res.json({ ...budget, allocations });
});

export default router;
