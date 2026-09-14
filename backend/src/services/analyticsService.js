/**
 * Analytics Service — §3.4
 *
 * - Savings rate per month
 * - Category trend: current vs 3-month trailing average, flag if >25% deviation
 * - Debt payoff projections across all active debts
 */

import { supabase } from '../lib/supabase.js';
import { calculateDebtProjection } from './debtService.js';
import { computeCycleBounds } from '../utils/dateUtils.js';

/**
 * Compute analytics summary for a given month.
 */
export async function computeAnalytics(userId, month, settings) {
  const [year, mon] = month.split('-').map(Number);

  // Build date ranges for current month cycle
  const currentMonthStr = `${year}-${String(mon).padStart(2, '0')}`;
  const { start: currentStart, end: currentEnd } = computeCycleBounds(currentMonthStr, settings);

  const trailing = [];
  // Also collect history for last 6 months for chart
  const historyTrends = [];

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
    const trailingMonthStr = `${ty}-${String(tm).padStart(2, '0')}`;
    const { start, end } = computeCycleBounds(trailingMonthStr, settings);
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

  // Fetch all transactions for the last 6 months to build Income vs Expense history
  const historyStartStr = `${historyTrends[0].year}-${String(historyTrends[0].month).padStart(2, '0')}`;
  const { start: historyStart } = computeCycleBounds(historyStartStr, settings);
  const { data: allHistoryTxns } = await supabase
    .from('transactions')
    .select('date, type, amount')
    .eq('user_id', userId)
    .gte('date', historyStart)
    .lte('date', currentEnd);

  (allHistoryTxns || []).forEach(t => {
    const tYear = parseInt(t.date.substring(0, 4), 10);
    const tMonth = parseInt(t.date.substring(5, 7), 10);
    const hNode = historyTrends.find(h => h.year === tYear && h.month === tMonth);
    if (hNode) {
      if (t.type === 'income') hNode.income += Number(t.amount);
      if (t.type === 'expense') hNode.expense += Number(t.amount);
    }
  });

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

  // --- Generate Sankey Data ---
  const sankeyNodes = [{ name: 'Income' }, { name: 'Savings' }];
  const sankeyLinks = [];

  let nodeIdx = 2;
  const categoryIndices = {};

  categoryTrends.forEach(c => {
    if (c.current_spend > 0) {
      sankeyNodes.push({ name: c.name || 'Uncategorized' });
      categoryIndices[c.name || 'Uncategorized'] = nodeIdx;
      nodeIdx++;
    }
  });

  const netSavings = totalIncome - totalExpenses;

  if (netSavings >= 0) {
    if (netSavings > 0) sankeyLinks.push({ source: 0, target: 1, value: round2(netSavings) });
    categoryTrends.forEach(c => {
      if (c.current_spend > 0) {
        sankeyLinks.push({ source: 0, target: categoryIndices[c.name || 'Uncategorized'], value: round2(c.current_spend) });
      }
    });
  } else {
    // Deficit scenario
    sankeyNodes[1] = { name: 'Overspent (Deficit)' };
    const deficit = Math.abs(netSavings);
    let remainingIncome = totalIncome;

    categoryTrends.forEach(c => {
      if (c.current_spend > 0) {
        const catIdx = categoryIndices[c.name || 'Uncategorized'];
        const fromIncome = Math.min(c.current_spend, remainingIncome);
        const fromDeficit = c.current_spend - fromIncome;
        
        if (fromIncome > 0) {
          sankeyLinks.push({ source: 0, target: catIdx, value: round2(fromIncome) });
          remainingIncome -= fromIncome;
        }
        if (fromDeficit > 0) {
          sankeyLinks.push({ source: 1, target: catIdx, value: round2(fromDeficit) });
        }
      }
    });
  }

  const sankey = { nodes: sankeyNodes, links: sankeyLinks };

  return {
    month,
    total_income: round2(totalIncome),
    total_expenses: round2(totalExpenses),
    savings_rate: savingsRate,
    net_savings: round2(totalIncome - totalExpenses),
    category_trends: categoryTrends,
    anomaly_count: categoryTrends.filter((c) => c.flagged).length,
    sankey,
    history: historyTrends.map(h => ({ ...h, income: round2(h.income), expense: round2(h.expense) }))
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

function round2(n) {
  return Math.round(n * 100) / 100;
}
