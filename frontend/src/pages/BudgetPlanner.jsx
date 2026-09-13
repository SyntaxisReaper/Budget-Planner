import { useState, useEffect } from 'react';
import { Calculator, ChevronRight, RefreshCw, HandCoins } from 'lucide-react';
import { useBudget, useIncome, useItems, useDebts, useGoals } from '../hooks/useBudget.js';
import AllocationBreakdown from '../components/AllocationBreakdown.jsx';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function BudgetPlanner() {
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [leftover, setLeftover] = useState('savings');
  const [manualAllocations, setManualAllocations] = useState({});
  const [isManualMode, setIsManualMode] = useState(false);

  const { budgetQuery, allocateMutation } = useBudget(month);
  const { query: incomeQuery } = useIncome();
  const { query: itemsQuery } = useItems();
  const { query: debtsQuery } = useDebts();
  const { query: goalsQuery } = useGoals();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings').then(res => res.data),
  });

  const budget = budgetQuery.data;
  const income = incomeQuery.data || [];
  const items = itemsQuery.data || [];
  const debts = debtsQuery.data?.filter(d => d.status === 'active') || [];
  const goals = goalsQuery.data || [];

  let totalIncome = 0;
  if (settings && settings.cycle_income > 0) {
    totalIncome = Number(settings.cycle_income);
  } else {
    totalIncome = income.reduce((s, src) => {
      let m = Number(src.amount);
      if (src.frequency === 'weekly') m = m * 52 / 12;
      else if (src.frequency === 'one-time') m = 0;
      return s + m;
    }, 0);
  }

  // Pre-fill manual allocations with existing budget allocations if we switch modes
  useEffect(() => {
    if (isManualMode && budget && budget.allocations) {
      const current = { ...manualAllocations };
      let changed = false;
      budget.allocations.forEach(a => {
        const key = `${a.target_type}_${a.target_id}`;
        if (current[key] === undefined && a.allocated_amount > 0) {
          current[key] = a.allocated_amount;
          changed = true;
        }
      });
      if (changed) setManualAllocations(current);
    }
  }, [isManualMode, budget]);

  const handleManualChange = (type, id, val) => {
    setManualAllocations(prev => {
      const next = { ...prev };
      if (val === '') {
        delete next[`${type}_${id}`];
      } else {
        next[`${type}_${id}`] = val;
      }
      return next;
    });
  };

  async function handleAllocate() {
    try {
      await allocateMutation.mutateAsync({ 
        month, 
        leftover_preference: leftover,
        manual_allocations: isManualMode ? manualAllocations : {}
      });
      toast.success('Budget plan generated!');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title">Budget Planner</h1>
          <p className="page-subtitle">Distribute your income across all categories</p>
        </div>
        <button className={`btn ${isManualMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsManualMode(!isManualMode)}>
          <HandCoins size={16} /> {isManualMode ? 'Manual Mode: ON' : 'Manual Mode: OFF'}
        </button>
      </div>

      <div className="grid-2 mb-6" style={{ alignItems: 'start' }}>
        {/* Controls */}
        <div className="card h-full flex flex-col justify-between">
          <div>
            <div className="section-title mb-5">⚙️ Allocation Settings</div>
            <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '0 0 auto' }}>
                <label className="label">Month/Cycle Start</label>
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
            </div>
            
            {totalIncome > 0 && (
              <div className="mt-6 text-sm text-muted">
                Available Income Pool:
                <span className="font-bold" style={{ color: 'var(--color-text)', marginLeft: 6, fontSize: '1.2rem' }}>
                  {fmt.format(totalIncome)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              id="run-allocator-btn"
              className="btn btn-primary"
              onClick={handleAllocate}
              disabled={allocateMutation.isPending}
            >
              {allocateMutation.isPending ? (
                <><span className="spinner" /> Calculating…</>
              ) : (
                <><Calculator size={15} /> Run Auto-Allocator</>
              )}
            </button>
            {budget && (
              <button className="btn btn-ghost" onClick={handleAllocate} title="Recalculate">
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Manual Allocation Panel */}
        {isManualMode && (
          <div className="card h-full" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <div className="section-title mb-4">✍️ Manual Overrides</div>
            <p className="text-xs text-muted mb-4">Set specific amounts below. Leave blank to let the auto-allocator handle it.</p>
            
            <div className="flex flex-col gap-3">
              {items.map(i => (
                <div key={`item_${i.id}`} className="flex justify-between items-center gap-4">
                  <span className="text-sm font-medium">{i.name} (Need: {fmt.format(i.amount_needed)})</span>
                  <input type="number" className="input" style={{ width: 100 }} placeholder="Auto" 
                    value={manualAllocations[`item_${i.id}`] || ''} onChange={e => handleManualChange('item', i.id, e.target.value)} />
                </div>
              ))}
              {debts.map(d => (
                <div key={`debt_${d.id}`} className="flex justify-between items-center gap-4">
                  <span className="text-sm font-medium">{d.name} (Bal: {fmt.format(d.remaining_balance)})</span>
                  <input type="number" className="input" style={{ width: 100 }} placeholder="Auto" 
                    value={manualAllocations[`debt_${d.id}`] || ''} onChange={e => handleManualChange('debt', d.id, e.target.value)} />
                </div>
              ))}
              {goals.map(g => (
                <div key={`goal_${g.id}`} className="flex justify-between items-center gap-4">
                  <span className="text-sm font-medium">{g.name} (Goal: {fmt.format(g.target_amount)})</span>
                  <input type="number" className="input" style={{ width: 100 }} placeholder="Auto" 
                    value={manualAllocations[`goal_${g.id}`] || ''} onChange={e => handleManualChange('goal', g.id, e.target.value)} />
                </div>
              ))}
            </div>
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
                is_manual: a.is_manual
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
          <button className="btn btn-primary btn-sm mt-4" onClick={handleAllocate}>
            <ChevronRight size={14} /> Generate Plan
          </button>
        </div>
      )}
    </div>
  );
}
