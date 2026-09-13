/**
 * Monthly Budget Allocator — implements §3.1 of the spec.
 *
 * Allocation order:
 *  1. Essential items (full funding; proportional scale if insufficient)
 *  2. Debt payments — equal distribution (§3.2)
 *  3. Goal contributions — monthly_needed (§3.3); proportional scale if insufficient
 *  4. Important items, then Optional items — remaining income
 *  5. Leftover → savings buffer or extra debt payoff
 */

import { computeMonthlyNeeded } from './goalService.js';
import { distributeDebtPayments } from './debtService.js';

/**
 * @param {object} params
 * @param {number} params.totalIncome
 * @param {Array}  params.items
 * @param {Array}  params.activeDebts
 * @param {Array}  params.goals
 * @param {string} params.leftoverPreference  'savings' | 'debt'
 * @param {string} params.month  YYYY-MM-DD (first of month)
 */
export function runAllocator({ totalIncome, items, activeDebts, goals, leftoverPreference, month }) {
  let remaining = totalIncome;
  const lineItems = [];
  const atRiskGoals = [];

  // ─── Step 1: Essential items ───────────────────────────────────────────────
  const essentials = items.filter((i) => i.priority === 'essential');
  const totalEssentialNeeded = essentials.reduce((s, i) => s + Number(i.amount_needed), 0);

  if (totalEssentialNeeded > 0) {
    const scale = remaining >= totalEssentialNeeded ? 1 : remaining / totalEssentialNeeded;
    for (const item of essentials) {
      const allocated = round2(Number(item.amount_needed) * scale);
      lineItems.push({ target_type: 'item', target_id: item.id, name: item.name, priority: 'essential', allocated_amount: allocated });
      remaining -= allocated;
    }
    remaining = Math.max(0, remaining);
  }

  // ─── Step 2: Debt payments — equal distribution ────────────────────────────
  const debtPool = remaining; // everything left after essentials goes to debts first
  let debtAllocations = {};

  if (activeDebts.length > 0 && debtPool > 0) {
    debtAllocations = distributeDebtPayments(activeDebts, debtPool);
    for (const debt of activeDebts) {
      const allocated = debtAllocations[debt.id] || 0;
      lineItems.push({ target_type: 'debt', target_id: debt.id, name: debt.name, allocated_amount: round2(allocated) });
      remaining -= allocated;
    }
    remaining = Math.max(0, remaining);
  }

  // ─── Step 3: Goal contributions ────────────────────────────────────────────
  const goalContributions = goals
    .map((g) => {
      const { monthly_needed } = computeMonthlyNeeded(g, month);
      return { ...g, monthly_needed: Math.max(0, monthly_needed || 0) };
    })
    .filter((g) => g.monthly_needed > 0);

  const totalGoalNeeded = goalContributions.reduce((s, g) => s + g.monthly_needed, 0);

  if (totalGoalNeeded > 0) {
    const scale = remaining >= totalGoalNeeded ? 1 : remaining / totalGoalNeeded;
    for (const goal of goalContributions) {
      const allocated = round2(goal.monthly_needed * scale);
      lineItems.push({ target_type: 'goal', target_id: goal.id, name: goal.name, allocated_amount: allocated });
      remaining -= allocated;

      if (scale < 1) {
        atRiskGoals.push({
          id: goal.id,
          name: goal.name,
          monthly_needed: goal.monthly_needed,
          actually_allocated: allocated,
          shortfall: round2(goal.monthly_needed - allocated),
        });
      }
    }
    remaining = Math.max(0, remaining);
  }

  // ─── Step 4a: Important items ──────────────────────────────────────────────
  const important = items.filter((i) => i.priority === 'important');
  for (const item of important) {
    const needed = Number(item.amount_needed);
    const allocated = Math.min(needed, remaining);
    lineItems.push({ target_type: 'item', target_id: item.id, name: item.name, priority: 'important', allocated_amount: round2(allocated) });
    remaining -= allocated;
    if (remaining <= 0) break;
  }

  // ─── Step 4b: Optional items ───────────────────────────────────────────────
  const optional = items.filter((i) => i.priority === 'optional');
  for (const item of optional) {
    const needed = Number(item.amount_needed);
    const allocated = Math.min(needed, remaining);
    lineItems.push({ target_type: 'item', target_id: item.id, name: item.name, priority: 'optional', allocated_amount: round2(allocated) });
    remaining -= allocated;
    if (remaining <= 0) break;
  }

  // ─── Step 5: Leftover ──────────────────────────────────────────────────────
  const leftover = round2(Math.max(0, remaining));
  const totalAllocated = round2(lineItems.reduce((s, li) => s + li.allocated_amount, 0));
  const totalSaved = leftoverPreference === 'savings' ? leftover : 0;

  return { lineItems, atRiskGoals, totalAllocated, totalSaved, leftover, leftoverPreference };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
