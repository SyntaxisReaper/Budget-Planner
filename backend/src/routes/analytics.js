import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { computeAnalytics, computeDebtProjections } from '../services/analyticsService.js';

const router = Router();
router.use(authenticate);

// GET /api/analytics/summary?month=YYYY-MM
router.get('/summary', async (req, res) => {
  const month = req.query.month || new Date().toISOString().substring(0, 7);
  const { data: settings } = await supabase
    .from('user_settings')
    .select('cycle_start_date, cycle_days')
    .eq('user_id', req.userId)
    .single();

  const summary = await computeAnalytics(req.userId, month, settings);
  res.json(summary);
});

// GET /api/analytics/debt-projection
router.get('/debt-projection', async (req, res) => {
  const { data: debts, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', req.userId)
    .eq('status', 'active');

  if (error) throw error;

  // Get latest budget to find debt allocation pool
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', req.userId)
    .order('month', { ascending: false })
    .limit(1);

  let debtAllocations = {};
  if (budgets && budgets.length > 0) {
    const { data: allocs } = await supabase
      .from('budget_allocations')
      .select('target_id, allocated_amount')
      .eq('budget_id', budgets[0].id)
      .eq('target_type', 'debt');

    if (allocs) {
      allocs.forEach((a) => {
        debtAllocations[a.target_id] = Number(a.allocated_amount);
      });
    }
  }

  const projections = computeDebtProjections(debts, debtAllocations);
  res.json(projections);
});

export default router;
