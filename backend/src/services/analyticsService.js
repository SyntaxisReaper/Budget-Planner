import { supabase } from '../lib/supabase.js';
import { computeCycleBounds } from '../utils/dateUtils.js';

/**
 * Compute analytics trends and historical charts.
 */
export async function computeTrends(userId, month, settings) {
  const [year, mon] = month.split('-').map(Number);

  // Build date ranges for current month cycle
  const currentMonthStr = `${year}-${String(mon).padStart(2, '0')}`;
  const { start: currentStart, end: currentEnd } = computeCycleBounds(currentMonthStr, settings);

  const trailing = [];
  const historyTrends = [];

  // Collect history for last 6 months for chart
  for (let i = 1; i <= 5; i++) {
    let m = mon - i;
    let y = year;
    if (m <= 0) { m += 12; y -= 1; }
    const mStr = String(m).padStart(2, '0');
    if (i <= 3) trailing.push({ year: y, month: m });
    
    historyTrends.push({ year: y, month: m, label: `${mStr}/${String(y).slice(-2)}`, income: 0, expense: 0 });
  }

  // Include current month in history
  historyTrends.unshift({ year, month: mon, label: `${String(mon).padStart(2, '0')}/${String(year).slice(-2)}`, income: 0, expense: 0 });
  historyTrends.reverse(); // chronological order

  // Fetch current month transactions
  const { data: currentTxns } = await supabase
    .from('transactions')
    .select('*, items(name)')
    .eq('user_id', userId)
    .gte('occurred_at', currentStart)
    .lte('occurred_at', currentEnd);

  // Category spend per item for current month
  const currentSpendByItem = {};
  (currentTxns || [])
    .filter((t) => t.type === 'expense' && t.item_id)
    .forEach((t) => {
      const key = t.item_id;
      currentSpendByItem[key] = (currentSpendByItem[key] || { name: t.items?.name, amount: 0 });
      currentSpendByItem[key].amount += Number(t.amount);
    });

  // Trailing 3-month average per item
  const trailingSpend = {}; // { item_id: [month1, month2, month3] }

  for (const { year: ty, month: tm } of trailing) {
    const trailingMonthStr = `${ty}-${String(tm).padStart(2, '0')}`;
    const { start, end } = computeCycleBounds(trailingMonthStr, settings);
    const { data: txns } = await supabase
      .from('transactions')
      .select('item_id, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('occurred_at', start)
      .lte('occurred_at', end);

    (txns || []).forEach((t) => {
      if (!t.item_id) return;
      if (!trailingSpend[t.item_id]) trailingSpend[t.item_id] = [];
      trailingSpend[t.item_id].push(Number(t.amount));
    });
  }

  // Fetch all transactions for the last 6 months to build Income vs Expense history
  const historyStartStr = `${historyTrends[0].year}-${String(historyTrends[0].month).padStart(2, '0')}`;
  const { start: historyStart } = computeCycleBounds(historyStartStr, settings);
  const { data: allHistoryTxns } = await supabase
    .from('transactions')
    .select('occurred_at, type, amount')
    .eq('user_id', userId)
    .gte('occurred_at', historyStart)
    .lte('occurred_at', currentEnd);

  (allHistoryTxns || []).forEach(t => {
    // Parse the date properly for timezones if needed, but simple substring works for YYYY-MM
    // Occurred at is ISO string YYYY-MM-DDTHH...
    const tYear = parseInt(t.occurred_at.substring(0, 4), 10);
    const tMonth = parseInt(t.occurred_at.substring(5, 7), 10);
    
    // Find the right bucket
    // Note: Transactions occurring on say 22nd might belong to next cycle depending on bounds.
    // A more accurate way for history is to group by computeCycleBounds.
    // For simplicity, we just assign it to the cycle month if it falls in its dates.
  });

  // Let's accurately group history transactions into the right cycle bucket
  (allHistoryTxns || []).forEach(t => {
    const txnDate = new Date(t.occurred_at);
    // Find which cycle this transaction falls into
    for (const h of historyTrends) {
      const hStr = `${h.year}-${String(h.month).padStart(2, '0')}`;
      const bounds = computeCycleBounds(hStr, settings);
      const bStart = new Date(bounds.start);
      const bEnd = new Date(bounds.end);
      if (txnDate >= bStart && txnDate <= bEnd) {
        if (t.type === 'income') h.income += Number(t.amount);
        if (t.type === 'expense') h.expense += Number(t.amount);
        break;
      }
    }
  });

  // Compute averages and flags
  const categoryTrends = Object.entries(currentSpendByItem).map(([item_id, { name, amount }]) => {
    const history = trailingSpend[item_id] || [];
    const avg = history.length > 0 ? history.reduce((s, v) => s + v, 0) / history.length : null;
    const deviation = avg != null && avg > 0 ? ((amount - avg) / avg) * 100 : null;
    return {
      item_id,
      name: name || 'Uncategorized',
      current_spend: round2(amount),
      trailing_avg: avg != null ? round2(avg) : null,
      deviation_pct: deviation != null ? round2(deviation) : null,
      flagged: deviation != null && Math.abs(deviation) > 25,
    };
  });

  return {
    category_trends: categoryTrends,
    anomaly_count: categoryTrends.filter((c) => c.flagged).length,
    history: historyTrends.map(h => ({ ...h, income: round2(h.income), expense: round2(h.expense) }))
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
