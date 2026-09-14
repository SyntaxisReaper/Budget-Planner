/**
 * Debt Payoff Service — Tiered Priority Distribution (§3.2)
 */

/**
 * Helper to distribute a pool evenly across a specific set of debts,
 * redistributing when a debt's balance would be fully paid off.
 */
function distributeEqually(debtsForGroup, allocations, remainingPool) {
  let pool = remainingPool;
  let activeForEqual = debtsForGroup.filter((d) => d.remaining_balance > allocations[d.id]);

  while (pool > 0.001 && activeForEqual.length > 0) {
    const share = pool / activeForEqual.length;
    const nextActive = [];

    for (const debt of activeForEqual) {
      const canTake = Math.max(0, debt.remaining_balance - allocations[debt.id]);
      const give = Math.min(share, canTake);
      allocations[debt.id] += give;
      pool -= give;

      if (canTake - give > 0.001) {
        nextActive.push(debt); // still has room
      }
    }

    if (activeForEqual.length === nextActive.length) {
      // Everyone took their full share; pool is fully drained
      break; 
    }
    
    activeForEqual = nextActive;
  }
  return pool;
}

/**
 * Distribute a debt payment pool across active debts,
 * respecting min_payment floors first, then paying off 
 * extra amounts hierarchically by priority (high > normal > low).
 *
 * @param {Array}  debts  - active debt objects
 * @param {number} pool   - total amount available for debt payments
 * @returns {Object}      - map of debt_id → allocated_amount
 */
export function distributeDebtPayments(debts, pool) {
  const allocations = {};
  debts.forEach((d) => (allocations[d.id] = 0));

  let workingDebts = debts.map((d) => ({
    ...d,
    remaining_balance: Number(d.remaining_balance),
    min_payment: Number(d.min_payment) || 0,
    priority: d.priority || 'normal'
  }));
  let remainingPool = pool;

  // 1. Handle min_payment floors first for ALL debts regardless of priority
  for (const debt of workingDebts) {
    if (debt.min_payment > 0 && debt.remaining_balance > 0) {
      const minAlloc = Math.min(debt.min_payment, debt.remaining_balance, remainingPool);
      allocations[debt.id] += minAlloc;
      remainingPool -= minAlloc;
    }
  }

  // 2. Distribute leftover pool by priority tiers
  const tiers = ['high', 'normal', 'low'];

  for (const tier of tiers) {
    if (remainingPool <= 0.001) break;
    const tierDebts = workingDebts.filter(d => d.priority === tier);
    if (tierDebts.length > 0) {
      remainingPool = distributeEqually(tierDebts, allocations, remainingPool);
    }
  }

  // 3. Round all allocations to 2 decimal places
  Object.keys(allocations).forEach((id) => {
    allocations[id] = Math.round(allocations[id] * 100) / 100;
  });

  return allocations;
}

/**
 * Project months to payoff for a single debt.
 * @param {Object} debt
 * @param {number} monthlyPayment
 */
export function calculateDebtProjection(debt, monthlyPayment) {
  const balance = Number(debt.remaining_balance);
  const rate = Number(debt.interest_rate) || 0;
  const monthlyRate = rate / 100 / 12;

  if (monthlyPayment <= 0) {
    return { months_to_payoff: null, payoff_date: null, total_interest: null };
  }

  if (monthlyRate === 0) {
    const months = Math.ceil(balance / monthlyPayment);
    return {
      months_to_payoff: months,
      payoff_date: addMonths(new Date(), months).toISOString().split('T')[0],
      total_interest: 0,
    };
  }

  // Standard amortization
  let bal = balance;
  let months = 0;
  let totalInterest = 0;
  while (bal > 0.01 && months < 1200) {
    const interest = bal * monthlyRate;
    totalInterest += interest;
    const principal = monthlyPayment - interest;
    if (principal <= 0) {
      return { months_to_payoff: null, payoff_date: null, total_interest: null, note: 'Payment too low to cover interest' };
    }
    bal -= principal;
    months++;
  }

  return {
    months_to_payoff: months,
    payoff_date: addMonths(new Date(), months).toISOString().split('T')[0],
    total_interest: Math.round(totalInterest * 100) / 100,
  };
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
