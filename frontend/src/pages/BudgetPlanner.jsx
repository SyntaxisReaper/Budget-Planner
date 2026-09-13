import { useState } from 'react';
import { Calculator, ChevronRight, RefreshCw } from 'lucide-react';
import { useBudget, useIncome } from '../hooks/useBudget.js';
import AllocationBreakdown from '../components/AllocationBreakdown.jsx';
import toast from 'react-hot-toast';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function BudgetPlanner() {
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [leftover, setLeftover] = useState('savings');
  const { budgetQuery, allocateMutation } = useBudget(month);
  const { query: incomeQuery } = useIncome();

  const budget = budgetQuery.data;
  const income = incomeQuery.data || [];
  const totalIncome = income.reduce((s, src) => {
    let m = Number(src.amount);
    if (src.frequency === 'weekly') m = m * 52 / 12;
    else if (src.frequency === 'one-time') m = 0;
    return s + m;
  }, 0);

  async function handleAllocate() {
    try {
      await allocateMutation.mutateAsync({ month, leftover_preference: leftover });
      toast.success('Budget plan generated!');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Budget Planner</h1>
        <p className="page-subtitle">Run the monthly allocator to distribute your income across all categories</p>
      </div>

      {/* Controls */}
      <div className="card mb-6">
        <div className="section-title mb-5">⚙️ Allocation Settings</div>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label className="label">Month</label>
            <input id="budget-month" type="month" className="input" value={month}
              onChange={(e) => setMonth(e.target.value)} style={{ width: 'auto' }} />
          </div>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label className="label">Leftover Income</label>
            <select id="budget-leftover" className="select" value={leftover}
              onChange={(e) => setLeftover(e.target.value)} style={{ width: 'auto' }}>
              <option value="savings">→ Savings Buffer</option>
              <option value="debt">→ Extra Debt Payoff</option>
            </select>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 12, paddingBottom: 0 }}>
            <div style={{ marginTop: 'auto', paddingBottom: 0 }}>
              <div className="label">&nbsp;</div>
              <button
                id="run-allocator-btn"
                className="btn btn-primary"
                onClick={handleAllocate}
                disabled={allocateMutation.isPending}
              >
                {allocateMutation.isPending ? (
                  <><span className="spinner" /> Calculating…</>
                ) : (
                  <><Calculator size={15} /> Run Allocator</>
                )}
              </button>
            </div>
            {budget && (
              <div style={{ marginTop: 'auto' }}>
                <div className="label">&nbsp;</div>
                <button className="btn btn-ghost" onClick={handleAllocate} title="Recalculate">
                  <RefreshCw size={14} /> Recalculate
                </button>
              </div>
            )}
          </div>
        </div>

        {totalIncome > 0 && (
          <div className="mt-4 text-sm text-muted">
            Monthly income from {income.length} source{income.length !== 1 ? 's' : ''}:
            <span className="font-bold" style={{ color: 'var(--color-text)', marginLeft: 6 }}>{fmt.format(totalIncome)}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {budgetQuery.isLoading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : budget ? (
        <>
          {/* Summary cards */}
          <div className="grid-4 mb-6">
            <div className="card stat-card">
              <div className="stat-label">Total Income</div>
              <div className="stat-value primary">{fmt.format(budget.total_income)}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Allocated</div>
              <div className="stat-value">{fmt.format(budget.total_allocated)}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Saved</div>
              <div className="stat-value positive">{fmt.format(budget.total_saved)}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Leftover</div>
              <div className="stat-value accent">
                {fmt.format(Math.max(0, Number(budget.total_income) - Number(budget.total_allocated)))}
              </div>
            </div>
          </div>

          {/* Allocation breakdown */}
          <div className="card">
            <div className="section-header mb-6">
              <div className="section-title">📊 Allocation Breakdown</div>
              <div className="text-xs text-muted">
                {budget.allocations?.length || 0} line items
              </div>
            </div>
            <AllocationBreakdown
              lineItems={budget.allocations?.map((a) => ({
                target_type: a.target_type,
                target_id: a.target_id,
                name: a.name || a.target_id,
                allocated_amount: a.allocated_amount,
                spent_amount: a.spent_amount,
              }))}
              totalIncome={Number(budget.total_income)}
              atRiskGoals={[]}
            />
          </div>
        </>
      ) : (
        <div className="card empty-state">
          <div className="empty-state-icon"><Calculator size={28} color="var(--color-text-3)" /></div>
          <p>No budget plan for {month} yet.</p>
          <button className="btn btn-primary btn-sm" onClick={handleAllocate}>
            <ChevronRight size={14} /> Generate Plan
          </button>
        </div>
      )}
    </div>
  );
}
