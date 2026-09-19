import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get all notes
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json(data);
});

// Create a note
router.post('/', async (req, res) => {
  const { title, content } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const { data, error } = await supabase
    .from('notes')
    .insert([{ 
      user_id: req.userId, 
      title, 
      content: content || null
    }])
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// Update a note
router.put('/:id', async (req, res) => {
  const { title, content } = req.body;
  const { data, error } = await supabase
    .from('notes')
    .update({ title, content })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) throw error;
  res.json(data);
});

// Delete a note
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

export default router;
