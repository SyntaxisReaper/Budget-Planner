const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const fmtNum = (n) => fmt.format(n ?? 0);

/**
 * AllocationBreakdown — shows how a month's budget was split
 * Props: { lineItems, totalIncome, atRiskGoals }
 */
export default function AllocationBreakdown({ lineItems = [], totalIncome = 0, atRiskGoals = [] }) {
  if (!lineItems.length) {
    return (
      <div className="empty-state">
        <p>No allocation yet. Run the budget planner to see a breakdown.</p>
      </div>
    );
  }

  const typeOrder = { item: 0, debt: 1, goal: 2 };
  const priorityOrder = { essential: 0, important: 1, optional: 2 };
  const sorted = [...lineItems].sort((a, b) => {
    const to = (typeOrder[a.target_type] ?? 3) - (typeOrder[b.target_type] ?? 3);
    if (to !== 0) return to;
    return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
  });

  const groups = {
    item: sorted.filter((l) => l.target_type === 'item'),
    debt: sorted.filter((l) => l.target_type === 'debt'),
    goal: sorted.filter((l) => l.target_type === 'goal'),
  };

  const groupLabel = { item: '🛒 Items', debt: '💳 Debts', goal: '🎯 Goals' };

  return (
    <div>
      {atRiskGoals.length > 0 && (
        <div className="error-msg mb-4" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)', color: 'var(--color-warning)' }}>
          ⚠️ {atRiskGoals.length} goal{atRiskGoals.length > 1 ? 's are' : ' is'} at risk due to insufficient funds.
        </div>
      )}

      {Object.entries(groups).map(([type, items]) => {
        if (!items.length) return null;
        return (
          <div key={type} className="mb-6">
            <div className="section-title text-sm mb-4" style={{ color: 'var(--color-text-2)' }}>
              {groupLabel[type]}
            </div>
            {items.map((li) => {
              const pct = totalIncome > 0 ? Math.min(100, (li.allocated_amount / totalIncome) * 100) : 0;
              const spentPct = li.allocated_amount > 0 ? Math.min(100, ((li.spent_amount || 0) / li.allocated_amount) * 100) : 0;
              const isAtRisk = atRiskGoals.some((g) => g.id === li.target_id);

              return (
                <div key={li.target_id} className="allocation-row">
                  <div className="allocation-name">
                    <div className="flex items-center gap-2">
                      {li.name}
                      {li.priority && (
                        <span className={`badge badge-${li.priority}`}>{li.priority}</span>
                      )}
                      {isAtRisk && <span className="badge badge-danger">at risk</span>}
                    </div>
                  </div>

                  <div className="allocation-bar-wrap">
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted">{pct.toFixed(1)}%</span>
                  </div>

                  <div className="allocation-amounts">
                    <span className="allocation-allocated">{fmtNum(li.allocated_amount)}</span>
                    {li.spent_amount != null && (
                      <span className="allocation-spent">spent {fmtNum(li.spent_amount)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
