import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get user's people ledger
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('people_ledger')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json(data);
});

// Add to ledger
router.post('/', authenticate, async (req, res) => {
  const { person_name, amount, direction, note } = req.body;
  if (!person_name || amount === undefined || !direction) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data, error } = await supabase
    .from('people_ledger')
    .insert([{ 
      user_id: req.user.id, 
      person_name, 
      amount, 
      direction, 
      note,
      status: 'active'
    }])
    .select()
    .single();

  if (error) throw error;
  res.json(data);
});

// Update ledger entry
router.put('/:id', authenticate, async (req, res) => {
  const { person_name, amount, direction, note, status } = req.body;
  
  const { data, error } = await supabase
    .from('people_ledger')
    .update({ person_name, amount, direction, note, status })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) throw error;
  res.json(data);
});

// Delete ledger entry
router.delete('/:id', authenticate, async (req, res) => {
  const { error } = await supabase
    .from('people_ledger')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) throw error;
  res.json({ success: true });
});

// PUBLIC ROUTE: Get ledger details for payment link
router.get('/:id/public', async (req, res) => {
  // Use service role since public anon SELECT might not be configured yet via SQL in all environments
  const { data, error } = await supabase
    .from('people_ledger')
    .select('id, user_id, person_name, amount, direction, note, status, created_at')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Not found' });

  // Fetch the owner's UPI VPA and display name
  const { data: userSettings, error: settingsError } = await supabase
    .from('user_settings')
    .select('upi_vpa, display_name')
    .eq('user_id', data.user_id)
    .single();

  res.json({
    ...data,
    upi_vpa: userSettings?.upi_vpa || null,
    display_name: userSettings?.display_name || null
  });
});

export default router;
