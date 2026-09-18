import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { addDays, addMonths, addYears, format, isBefore, isEqual, parseISO } from 'date-fns';

const router = Router();
router.use(authenticate);

// GET /api/subscriptions
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, accounts(name, type)')
    .eq('user_id', req.userId)
    .order('next_date', { ascending: true });

  if (error) throw error;
  res.json(data);
});

// POST /api/subscriptions
router.post('/', async (req, res) => {
  const { name, amount, account_id, interval, next_date, status } = req.body;

  if (!name || amount == null || !account_id || !next_date) {
    return res.status(400).json({ error: 'name, amount, account_id, and next_date are required' });
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: req.userId,
      name,
      amount,
      account_id,
      interval: interval || 'monthly',
      next_date,
      status: status || 'active'
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// PUT /api/subscriptions/:id
router.put('/:id', async (req, res) => {
  const { name, amount, account_id, interval, next_date, status } = req.body;

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ 
      name, 
      amount, 
      account_id, 
      interval, 
      next_date, 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Subscription not found' });
  res.json(data);
});

// DELETE /api/subscriptions/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

// POST /api/subscriptions/process
// Automatically logs transactions for overdue active subscriptions and bumps next_date
router.post('/process', async (req, res) => {
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  
  // Find all active subscriptions where next_date <= today
  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', req.userId)
    .eq('status', 'active')
    .lte('next_date', todayDate);

  if (subsError) throw subsError;
  if (!subs || subs.length === 0) {
    return res.json({ message: 'No subscriptions to process.', count: 0 });
  }

  let processedCount = 0;

  for (const sub of subs) {
    let currentNextDate = parseISO(sub.next_date);
    const today = new Date();
    
    // In case someone hasn't logged in for months, we loop to catch up all missed payments
    while (isBefore(currentNextDate, today) || isEqual(currentNextDate, today)) {
      // Create a transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: req.userId,
          account_id: sub.account_id,
          type: 'expense',
          amount: sub.amount,
          occurred_at: format(currentNextDate, "yyyy-MM-dd'T'12:00:00'Z'"),
          note: `Auto-payment: ${sub.name}`
        });
      
      if (txError) {
        console.error('Failed to log subscription tx:', txError);
        break; // Stop processing this sub if tx fails
      }
      
      processedCount++;
      
      // Bump date
      if (sub.interval === 'weekly') {
        currentNextDate = addDays(currentNextDate, 7);
      } else if (sub.interval === 'yearly') {
        currentNextDate = addYears(currentNextDate, 1);
      } else {
        // default monthly
        currentNextDate = addMonths(currentNextDate, 1);
      }
    }

    // Update the subscription's next_date
    const newNextDateStr = format(currentNextDate, 'yyyy-MM-dd');
    await supabase
      .from('subscriptions')
      .update({ next_date: newNextDateStr, updated_at: new Date().toISOString() })
      .eq('id', sub.id);
  }

  res.json({ message: 'Processed subscriptions.', count: processedCount });
});

export default router;
