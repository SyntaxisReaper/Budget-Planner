/**
 * Analytics Service — §3.4
 *
 * - Savings rate per month
 * - Category trend: current vs 3-month trailing average, flag if >25% deviation
 * - Debt payoff projections across all active debts
 */

import { supabase } from '../lib/supabase.js';
import { calculateDebtProjection } from './debtService.js';

/**
 * Compute analytics summary for a given month.
 */
export async function computeAnalytics(userId, month) {
  const [year, mon] = month.split('-').map(Number);

  // Build date ranges for current month and past 3 months
  const currentStart = `${year}-${String(mon).padStart(2, '0')}-01`;
  const currentEnd = lastDayOf(year, mon);

  // Trailing 3 months (not including current)
  const trailing = [];
  for (let i = 1; i <= 3; i++) {
    let m = mon - i;
    let y = year;
    if (m <= 0) { m += 12; y -= 1; }
    trailing.push({ year: y, month: m });
  }

  // Fetch current month transactions
  const { data: currentTxns } = await supabase
    .from('transactions')
    .select('*, items(name, priority)')
    .eq('user_id', userId)
    .gte('date', currentStart)
    .lte('date', currentEnd);

  const totalIncome = (currentTxns || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = (currentTxns || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 10000) / 100 : 0;

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
    const start = `${ty}-${String(tm).padStart(2, '0')}-01`;
    const end = lastDayOf(ty, tm);
    const { data: txns } = await supabase
      .from('transactions')
      .select('item_id, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end);

    (txns || []).forEach((t) => {
      if (!t.item_id) return;
      if (!trailingSpend[t.item_id]) trailingSpend[t.item_id] = [];
      trailingSpend[t.item_id].push(Number(t.amount));
    });
  }

  // Compute averages and flags
  const categoryTrends = Object.entries(currentSpendByItem).map(([item_id, { name, amount }]) => {
    const history = trailingSpend[item_id] || [];
    const avg = history.length > 0 ? history.reduce((s, v) => s + v, 0) / history.length : null;
    const deviation = avg != null && avg > 0 ? ((amount - avg) / avg) * 100 : null;
    return {
      item_id,
      name,
      current_spend: round2(amount),
      trailing_avg: avg != null ? round2(avg) : null,
      deviation_pct: deviation != null ? round2(deviation) : null,
      flagged: deviation != null && Math.abs(deviation) > 25,
    };
  });

  return {
    month,
    total_income: round2(totalIncome),
    total_expenses: round2(totalExpenses),
    savings_rate: savingsRate,
    net_savings: round2(totalIncome - totalExpenses),
    category_trends: categoryTrends,
    anomaly_count: categoryTrends.filter((c) => c.flagged).length,
  };
}

/**
 * Project payoff timelines for all active debts.
 */
export function computeDebtProjections(debts, debtAllocations) {
  return debts.map((debt) => {
    const monthlyPayment = debtAllocations[debt.id] || Number(debt.min_payment) || 0;
    const projection = calculateDebtProjection(debt, monthlyPayment);
    return {
      id: debt.id,
      name: debt.name,
      remaining_balance: Number(debt.remaining_balance),
      monthly_payment: monthlyPayment,
      ...projection,
    };
  });
}

function lastDayOf(year, month) {
  return new Date(year, month, 0).toISOString().split('T')[0];
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
