import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get all contacts
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('user_id', req.userId)
    .order('name', { ascending: true });

  if (error) throw error;
  res.json(data);
});

// Create a contact
router.post('/', async (req, res) => {
  const { name, avatar, email, phone, birthday } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const { data, error } = await supabase
    .from('people')
    .insert([{ 
      user_id: req.userId, 
      name, 
      avatar,
      email: email || null,
      phone: phone || null,
      birthday: birthday || null,
    }])
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// Update a contact
router.put('/:id', async (req, res) => {
  const { name, avatar, email, phone, birthday } = req.body;
  const { data, error } = await supabase
    .from('people')
    .update({ 
      name, 
      avatar,
      email: email || null,
      phone: phone || null,
      birthday: birthday || null,
    })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) throw error;
  res.json(data);
});

// Delete a contact
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

export default router;
