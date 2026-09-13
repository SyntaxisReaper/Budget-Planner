import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/items
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', req.userId)
    .order('priority')
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json(data);
});

// POST /api/items
router.post('/', async (req, res) => {
  const { name, amount_needed, priority, is_recurring, due_date, category } = req.body;
  if (!name || amount_needed == null || !priority) {
    return res.status(400).json({ error: 'name, amount_needed, and priority are required' });
  }
  const validPriorities = ['essential', 'important', 'optional'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${validPriorities.join(', ')}` });
  }

  const { data, error } = await supabase
    .from('items')
    .insert({ user_id: req.userId, name, amount_needed, priority, is_recurring: is_recurring ?? false, due_date, category: category || 'General' })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// PUT /api/items/:id
router.put('/:id', async (req, res) => {
  const { name, amount_needed, priority, is_recurring, due_date, category } = req.body;
  const { data, error } = await supabase
    .from('items')
    .update({ name, amount_needed, priority, is_recurring, due_date, category: category || 'General' })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Item not found' });
  res.json(data);
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

export default router;
