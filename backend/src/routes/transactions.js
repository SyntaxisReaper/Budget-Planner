import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/transactions?month=YYYY-MM
router.get('/', async (req, res) => {
  let query = supabase
    .from('transactions')
    .select('*, items(name, priority)')
    .eq('user_id', req.userId)
    .order('date', { ascending: false });

  if (req.query.month) {
    const [year, month] = req.query.month.split('-');
    const start = `${year}-${month}-01`;
    const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
    query = query.gte('date', start).lte('date', end);
  }

  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
});

// POST /api/transactions
router.post('/', async (req, res) => {
  const { item_id, amount, type, date, note } = req.body;
  if (amount == null || !type || !date) {
    return res.status(400).json({ error: 'amount, type, and date are required' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'type must be income or expense' });
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({ user_id: req.userId, item_id: item_id || null, amount, type, date, note })
    .select()
    .single();

  if (error) throw error;

  // Update budget_allocations spent_amount if an item_id provided
  if (item_id && type === 'expense') {
    const currentMonth = date.substring(0, 7);
    const firstOfMonth = `${currentMonth}-01`;

    // Find the budget for this month
    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', req.userId)
      .eq('month', firstOfMonth)
      .single();

    if (budget) {
      const { data: alloc } = await supabase
        .from('budget_allocations')
        .select('id, spent_amount')
        .eq('budget_id', budget.id)
        .eq('target_type', 'item')
        .eq('target_id', item_id)
        .single();

      if (alloc) {
        await supabase
          .from('budget_allocations')
          .update({ spent_amount: Number(alloc.spent_amount) + Number(amount) })
          .eq('id', alloc.id);
      }
    }
  }

  // Update user_settings current_balance
  const { data: settings } = await supabase
    .from('user_settings')
    .select('id, current_balance')
    .eq('user_id', req.userId)
    .single();

  if (settings) {
    const delta = type === 'income' ? Number(amount) : -Number(amount);
    await supabase
      .from('user_settings')
      .update({ current_balance: Number(settings.current_balance || 0) + delta })
      .eq('id', settings.id);
  }

  res.status(201).json(data);
});

export default router;
