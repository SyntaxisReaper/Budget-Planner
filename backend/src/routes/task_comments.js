import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get comments for a task
router.get('/:taskId', async (req, res) => {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*, people:user_id(name, avatar)') // Since user_id references auth.users, getting avatar might need custom join or just auth profile. 
    // We'll just select * for now.
    .eq('task_id', req.params.taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  res.json(data);
});

// Create a comment
router.post('/:taskId', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  // verify user owns the task first
  const { data: task } = await supabase.from('tasks').select('id').eq('id', req.params.taskId).eq('user_id', req.userId).single();
  if (!task) return res.status(403).json({ error: 'Task not found or access denied' });

  const { data, error } = await supabase
    .from('task_comments')
    .insert([{ 
      user_id: req.userId, 
      task_id: req.params.taskId,
      text
    }])
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// Delete a comment
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

export default router;
