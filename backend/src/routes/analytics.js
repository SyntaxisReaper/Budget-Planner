import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { computeTrends } from '../services/analyticsService.js';

const router = Router();
router.use(authenticate);

// GET /api/analytics/trends?month=YYYY-MM
router.get('/trends', async (req, res) => {
  const month = req.query.month || new Date().toISOString().substring(0, 7);
  const { data: settings } = await supabase
    .from('user_settings')
    .select('cycle_start_date, cycle_days')
    .eq('user_id', req.userId)
    .single();

  const trends = await computeTrends(req.userId, month, settings);
  res.json(trends);
});
// GET /api/analytics/weekly-digest
router.get('/weekly-digest', async (req, res) => {
  const now = new Date();
  const weekEnd = new Date(now);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  
  const threeWeeksStart = new Date(weekStart);
  threeWeeksStart.setDate(weekStart.getDate() - 21);

  // 1. Total spent this week
  const { data: thisWeekData } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', req.userId)
    .eq('type', 'expense')
    .gte('occurred_at', weekStart.toISOString())
    .lte('occurred_at', weekEnd.toISOString());
    
  const total_spent = (thisWeekData || []).reduce((acc, t) => acc + Number(t.amount), 0);

  // 2. Three week average
  const { data: priorWeeksData } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', req.userId)
    .eq('type', 'expense')
    .gte('occurred_at', threeWeeksStart.toISOString())
    .lt('occurred_at', weekStart.toISOString());
    
  const priorTotal = (priorWeeksData || []).reduce((acc, t) => acc + Number(t.amount), 0);
  const three_week_avg = priorTotal / 3;

  // 3. Trends
  let change_pct = 0;
  if (three_week_avg > 0) {
    change_pct = Math.abs(((total_spent - three_week_avg) / three_week_avg) * 100);
  } else if (total_spent > 0) {
    change_pct = 100;
  }
  const trending_up = total_spent > three_week_avg;

  // 4. Spotlight goal
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', req.userId)
    .not('target_date', 'is', null)
    .order('target_date', { ascending: true })
    .limit(1);

  let spotlight_goal = null;
  if (goals && goals.length > 0) {
    const g = goals[0];
    const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
    spotlight_goal = {
      name: g.name,
      current_amount: g.current_amount,
      target_amount: g.target_amount,
      pct,
      target_date: g.target_date
    };
  }

  res.json({
    week_start: weekStart.toISOString().split('T')[0],
    week_end: weekEnd.toISOString().split('T')[0],
    total_spent,
    three_week_avg,
    change_pct,
    trending_up,
    spotlight_goal
  });
});

export default router;
