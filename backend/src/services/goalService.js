/**
 * Goal Service — §3.3 Monthly savings calculator
 */

/**
 * Compute monthly savings needed for a goal.
 * @param {Object} goal
 * @param {string} referenceMonth  YYYY-MM-DD (first of the allocation month)
 * @returns {{ monthly_needed: number, months_remaining: number }}
 */
export function computeMonthlyNeeded(goal, referenceMonth) {
  const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));

  if (!goal.target_date) {
    return { monthly_needed: 0, months_remaining: null };
  }

  const ref = new Date(referenceMonth);
  const target = new Date(goal.target_date);

  const months_remaining = Math.max(
    0,
    (target.getFullYear() - ref.getFullYear()) * 12 + (target.getMonth() - ref.getMonth())
  );

  if (months_remaining === 0) {
    return { monthly_needed: remaining, months_remaining: 0 };
  }

  return {
    monthly_needed: remaining / months_remaining,
    months_remaining,
  };
}
