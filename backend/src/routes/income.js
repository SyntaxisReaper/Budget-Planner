import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/income
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('income_sources')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json(data);
});

// POST /api/income
router.post('/', async (req, res) => {
  const { name, amount, frequency } = req.body;
  if (!name || amount == null || !frequency) {
    return res.status(400).json({ error: 'name, amount, and frequency are required' });
  }

  const { data, error } = await supabase
    .from('income_sources')
    .insert({ user_id: req.userId, name, amount, frequency })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// PUT /api/income/:id
router.put('/:id', async (req, res) => {
  const { name, amount, frequency } = req.body;
  const { data, error } = await supabase
    .from('income_sources')
    .update({ name, amount, frequency })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Income source not found' });
  res.json(data);
});

// DELETE /api/income/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('income_sources')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

export default router;
