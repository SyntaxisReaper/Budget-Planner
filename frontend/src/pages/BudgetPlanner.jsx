import { useState, useMemo } from 'react';
import { useBudget, useItems, useDebts, useGoals, useSettings } from '../hooks/useBudget.js';
import { computeCycleBounds } from '../lib/dateUtils.js';
import { motion } from 'framer-motion';
import { fadeUp, itemVariants, staggerContainer } from '../lib/motion.js';
import toast from '../lib/haptics.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function AllocationRow({ type, entity, allocationsMap, onSave, onRemove }) {
  const allocation = allocationsMap[`${type}_${entity.id}`];
  const allocatedAmount = allocation?.allocated_amount ? Number(allocation.allocated_amount) : 0;
  const spentAmount = allocation?.spent_amount ? Number(allocation.spent_amount) : 0;
  const [val, setVal] = useState(allocatedAmount > 0 ? allocatedAmount.toString() : '');

  const targetAmount = type === 'item' ? entity.amount_needed : type === 'debt' ? entity.min_payment || entity.remaining_balance : entity.target_amount;
  const pct = allocatedAmount > 0 ? Math.min(100, (spentAmount / allocatedAmount) * 100) : 0;

  async function handleBlur() {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      if (allocatedAmount > 0) {
        try {
          await onRemove({ target_type: type, target_id: entity.id });
          toast.success('Allocation removed');
          setVal('');
        } catch (err) { toast.error(err.message); }
      }
    } else if (num !== allocatedAmount) {
      try {
        await onSave({ target_type: type, target_id: entity.id, allocated_amount: num });
        toast.success('Allocation saved');
      } catch (err) { toast.error(err.message); }
    }
  }

  return (
    <div className="allocation-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', background: 'var(--color-bg)', padding: 'var(--space-4)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
      <div className="allocation-name" style={{ flex: '1 1 150px' }}>
        <div className="font-semibold">{entity.name}</div>
        <div className="text-xs text-muted">
          {type === 'item' ? `Needs: ${fmt.format(entity.amount_needed)}` :
           type === 'debt' ? `Bal: ${fmt.format(entity.remaining_balance)}` :
           `Goal: ${fmt.format(entity.target_amount)}`}
        </div>
      </div>
      
      <div className="flex gap-2 items-center" style={{ flex: '0 0 auto' }}>
        <div className="text-sm font-semibold">Allocated (₹)</div>
        <input type="number" inputMode="decimal" 
          className="input" 
          style={{ width: 100, padding: '6px 10px', textAlign: 'right' }} 
          placeholder="0.00" 
          value={val} 
          onChange={e => setVal(e.target.value)}
          onBlur={handleBlur}
        />
      </div>

      <div className="allocation-bar-wrap" style={{ flex: '1 1 200px' }}>
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>Spent: {fmt.format(spentAmount)}</span>
          {allocatedAmount > 0 ? <span>{pct.toFixed(0)}%</span> : null}
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%`, background: pct > 100 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
        </div>
      </div>
    </div>
  );
}

export default function BudgetPlanner() {
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));

  const { budgetQuery, allocateMutation, removeAllocation } = useBudget(month);
  const { query: itemsQuery } = useItems();
  const { query: debtsQuery } = useDebts();
  const { query: goalsQuery } = useGoals();
  const { data: settings } = useSettings();

  const { start: cycleStart, end: cycleEnd } = computeCycleBounds(month, settings?.data || settings);

  const budget = budgetQuery.data;
  const items = itemsQuery.data || [];
  const debts = debtsQuery.data?.filter(d => d.status === 'active') || [];
  const goals = goalsQuery.data || [];

  const allocationsMap = useMemo(() => {
    if (!budget?.allocations) return {};
    const map = {};
    budget.allocations.forEach(a => {
      map[`${a.target_type}_${a.target_id}`] = a;
    });
    return map;
  }, [budget]);

  const totalAllocated = useMemo(() => {
    return Object.values(allocationsMap).reduce((s, a) => s + Number(a.allocated_amount), 0);
  }, [allocationsMap]);

  return (
    <div className="page">
      <motion.div className="page-header flex items-center justify-between" variants={fadeUp} initial="hidden" animate="visible" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">Budget Planner</h1>
          <p className="page-subtitle">
            {settings && (settings.data?.cycle_start_date || settings.cycle_start_date)
              ? `Cycle: ${new Date(cycleStart).toLocaleDateString()} — ${new Date(cycleEnd).toLocaleDateString()}` 
              : 'Manually allocate funds for the cycle'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-muted">Cycle Month:</label>
          <input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </motion.div>

      <motion.div className="grid-2 mb-6" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card stat-card" variants={itemVariants}>
          <div className="stat-label">Total Allocated</div>
          <div className="stat-value">{fmt.format(totalAllocated)}</div>
        </motion.div>
        <motion.div className="card stat-card" variants={itemVariants}>
          <div className="stat-label">Remaining to zero (vs Planned Income)</div>
          <div className="stat-value text-muted">
            {settings ? fmt.format(Math.max(0, Number(settings.data?.cycle_income || settings.cycle_income) - totalAllocated)) : '₹0.00'}
          </div>
        </motion.div>
      </motion.div>

      <div className="card flex flex-col gap-8">
        <div>
          <div className="section-title mb-4">🛒 Items</div>
          <div className="flex flex-col gap-2">
            {items.map(i => (
              <AllocationRow key={`item_${i.id}`} type="item" entity={i} allocationsMap={allocationsMap} onSave={allocateMutation.mutateAsync} onRemove={removeAllocation.mutateAsync} />
            ))}
            {items.length === 0 && <div className="text-muted text-sm">No items configured.</div>}
          </div>
        </div>

        <div>
          <div className="section-title mb-4">💳 Debts & Rent</div>
          <div className="flex flex-col gap-2">
            {debts.map(d => (
              <AllocationRow key={`debt_${d.id}`} type="debt" entity={d} allocationsMap={allocationsMap} onSave={allocateMutation.mutateAsync} onRemove={removeAllocation.mutateAsync} />
            ))}
            {debts.length === 0 && <div className="text-muted text-sm">No active debts or rent.</div>}
          </div>
        </div>

        <div>
          <div className="section-title mb-4">🎯 Goals</div>
          <div className="flex flex-col gap-2">
            {goals.map(g => (
              <AllocationRow key={`goal_${g.id}`} type="goal" entity={g} allocationsMap={allocationsMap} onSave={allocateMutation.mutateAsync} onRemove={removeAllocation.mutateAsync} />
            ))}
            {goals.length === 0 && <div className="text-muted text-sm">No goals configured.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
