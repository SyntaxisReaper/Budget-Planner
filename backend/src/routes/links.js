import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get links for a specific target
router.get('/', async (req, res) => {
  const { from_type, from_id, to_type, to_id } = req.query;
  
  let query = supabase.from('links').select('*').eq('user_id', req.userId);
  
  if (from_type) query = query.eq('from_type', from_type);
  if (from_id) query = query.eq('from_id', from_id);
  if (to_type) query = query.eq('to_type', to_type);
  if (to_id) query = query.eq('to_id', to_id);

  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
});

// Create a link
router.post('/', async (req, res) => {
  const { from_type, from_id, to_type, to_id } = req.body;
  if (!from_type || !from_id || !to_type || !to_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data, error } = await supabase
    .from('links')
    .insert([{ user_id: req.userId, from_type, from_id, to_type, to_id }])
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// Delete a link
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('links')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

export default router;
