import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { computeCycleBounds } from '../utils/dateUtils.js';

const router = Router();
router.use(authenticate);

// GET /api/dashboard/summary?month=YYYY-MM
router.get('/summary', async (req, res) => {
  const month = req.query.month || new Date().toISOString().substring(0, 7);
  
  // 1. Fetch user settings to determine cycle bounds
  const { data: settings } = await supabase
    .from('user_settings')
    .select('cycle_start_date, cycle_days')
    .eq('user_id', req.userId)
    .single();

  const { start, end } = computeCycleBounds(month, settings);
  const firstOfMonth = `${month}-01`;

  // 2. Fetch total balance across all accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('user_id', req.userId)
    .eq('is_active', true);

  const totalBalance = (accounts || []).reduce((sum, a) => sum + Number(a.current_balance), 0);

  // 3. Fetch all transactions for this cycle to compute income/expense
  const { data: txns } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', req.userId)
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  let cycleIncome = 0;
  let cycleExpense = 0;
  
  (txns || []).forEach(t => {
    if (t.type === 'income') cycleIncome += Number(t.amount);
    if (t.type === 'expense') cycleExpense += Number(t.amount);
  });

  // 4. Fetch items spend vs allocation
  // First, get the budget for this month to find manual allocations
  const { data: budget } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', req.userId)
    .eq('month', firstOfMonth)
    .single();

  let itemAllocations = [];
  if (budget) {
    const { data: allocs } = await supabase
      .from('budget_allocations')
      .select('target_id, allocated_amount')
      .eq('budget_id', budget.id)
      .eq('target_type', 'item');
    itemAllocations = allocs || [];
  }

  // Get items list and join with their allocations and actual spent
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', req.userId)
    .order('priority');

  const { data: itemTxns } = await supabase
    .from('transactions')
    .select('item_id, amount')
    .eq('user_id', req.userId)
    .eq('type', 'expense')
    .gte('occurred_at', start)
    .lte('occurred_at', end)
    .not('item_id', 'is', null);

  const itemSpend = {};
  (itemTxns || []).forEach(t => {
    itemSpend[t.item_id] = (itemSpend[t.item_id] || 0) + Number(t.amount);
  });

  const itemsProgress = (items || []).map(item => {
    const alloc = itemAllocations.find(a => a.target_id === item.id);
    return {
      ...item,
      allocated_amount: alloc ? Number(alloc.allocated_amount) : 0,
      spent_amount: itemSpend[item.id] || 0
    };
  });

  // 5. Fetch debts/rent progress
  const { data: debts } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', req.userId)
    .eq('status', 'active');

  // Check if rent was paid this cycle
  const { data: debtTxns } = await supabase
    .from('transactions')
    .select('debt_id, amount')
    .eq('user_id', req.userId)
    .eq('type', 'debt_payment')
    .gte('occurred_at', start)
    .lte('occurred_at', end)
    .not('debt_id', 'is', null);
  
  const debtSpendThisCycle = {};
  (debtTxns || []).forEach(t => {
    debtSpendThisCycle[t.debt_id] = (debtSpendThisCycle[t.debt_id] || 0) + Number(t.amount);
  });

  const debtsProgress = (debts || []).map(d => ({
    ...d,
    paid_this_cycle: debtSpendThisCycle[d.id] || 0
  }));

  // 6. Fetch goals progress
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', req.userId);

  const summary = {
    month,
    cycle_bounds: { start, end },
    total_balance: totalBalance,
    cycle_income: cycleIncome,
    cycle_expense: cycleExpense,
    net_savings: cycleIncome - cycleExpense,
    savings_rate: cycleIncome > 0 ? ((cycleIncome - cycleExpense) / cycleIncome) * 100 : 0,
    items: itemsProgress,
    debts: debtsProgress,
    goals: goals || []
  };

  res.json(summary);
});

export default router;
