/**
 * Debt Payoff Service — Equal Distribution (§3.2)
 */

/**
 * Distribute a debt payment pool evenly across active debts,
 * respecting min_payment floors and recursively redistributing
 * when a debt's balance would be fully paid off.
 *
 * @param {Array}  debts  - active debt objects with id, remaining_balance, min_payment
 * @param {number} pool   - total amount available for debt payments this period
 * @returns {Object}      - map of debt_id → allocated_amount
 */
export function distributeDebtPayments(debts, pool) {
  const allocations = {};
  debts.forEach((d) => (allocations[d.id] = 0));

  let workingDebts = debts.map((d) => ({ ...d, remaining_balance: Number(d.remaining_balance), min_payment: Number(d.min_payment) || 0 }));
  let remainingPool = pool;

  // Handle min_payment floors first
  for (const debt of workingDebts) {
    if (debt.min_payment > 0 && debt.remaining_balance > 0) {
      const minAlloc = Math.min(debt.min_payment, debt.remaining_balance, remainingPool);
      allocations[debt.id] += minAlloc;
      remainingPool -= minAlloc;
    }
  }

  // Equal distribution of what's left
  let activeForEqual = workingDebts.filter(
    (d) => d.remaining_balance > allocations[d.id] // still has balance to pay
  );

  while (remainingPool > 0.001 && activeForEqual.length > 0) {
    const share = remainingPool / activeForEqual.length;
    const nextActive = [];
    let redistributed = 0;

    for (const debt of activeForEqual) {
      const canTake = Math.max(0, debt.remaining_balance - allocations[debt.id]);
      const give = Math.min(share, canTake);
      allocations[debt.id] += give;
      remainingPool -= give;

      if (canTake - give > 0.001) {
        nextActive.push(debt); // still has room
      } else {
        redistributed += share - give; // excess to redistribute
      }
    }

    remainingPool += redistributed;
    activeForEqual = nextActive;

    if (redistributed < 0.001) break; // converged
  }

  // Round all allocations to 2 decimal places
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
