import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get all tasks
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json(data);
});

// Create a task
router.post('/', async (req, res) => {
  const { title, description, priority, due_date, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const { data, error } = await supabase
    .from('tasks')
    .insert([{ 
      user_id: req.userId, 
      title, 
      description: description || null, 
      priority: priority || 'normal', 
      due_date: due_date || null,
      status: status || 'pending'
    }])
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// Update a task
router.put('/:id', async (req, res) => {
  const { title, description, priority, due_date, status } = req.body;
  const { data, error } = await supabase
    .from('tasks')
    .update({ title, description, priority, due_date, status })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) throw error;
  res.json(data);
});

// Delete a task
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

export default router;
