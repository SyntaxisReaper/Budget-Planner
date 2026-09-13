import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/goals
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', req.userId)
    .order('target_date', { ascending: true });

  if (error) throw error;

  // Compute monthly_needed and at_risk flag
  const today = new Date();
  const enriched = data.map((goal) => {
    const remaining = Number(goal.target_amount) - Number(goal.current_amount);
    let monthly_needed = null;
    let months_remaining = null;

    if (goal.target_date) {
      const target = new Date(goal.target_date);
      months_remaining = Math.max(
        0,
        (target.getFullYear() - today.getFullYear()) * 12 +
          (target.getMonth() - today.getMonth())
      );
      monthly_needed = months_remaining > 0 ? remaining / months_remaining : remaining;
    }

    return { ...goal, monthly_needed, months_remaining, at_risk: false };
  });

  res.json(enriched);
});

// POST /api/goals
router.post('/', async (req, res) => {
  const { name, target_amount, target_date } = req.body;
  if (!name || target_amount == null) {
    return res.status(400).json({ error: 'name and target_amount are required' });
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({ user_id: req.userId, name, target_amount, current_amount: 0, target_date })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// PUT /api/goals/:id
router.put('/:id', async (req, res) => {
  const { name, target_amount, current_amount, target_date } = req.body;
  const { data, error } = await supabase
    .from('goals')
    .update({ name, target_amount, current_amount, target_date })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Goal not found' });
  res.json(data);
});

// DELETE /api/goals/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

export default router;
