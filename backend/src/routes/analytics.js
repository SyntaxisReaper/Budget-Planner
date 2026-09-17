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

export default router;
