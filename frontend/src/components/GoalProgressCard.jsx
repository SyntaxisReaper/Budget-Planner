import { AlertTriangle } from 'lucide-react';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * GoalProgressCard
 * Props: { goal: { id, name, target_amount, current_amount, target_date, monthly_needed, months_remaining, at_risk } }
 */
export default function GoalProgressCard({ goal, onEdit, onDelete }) {
  const pct = Math.min(1, Number(goal.current_amount) / Math.max(1, Number(goal.target_amount)));
  const dashOffset = CIRCUMFERENCE * (1 - pct);
  const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));

  // Color based on completion
  const stroke = pct >= 1 ? 'var(--color-success)' : pct > 0.5 ? 'var(--color-accent)' : 'var(--color-primary)';

  return (
    <div className={`card ${goal.at_risk ? 'at-risk-card' : ''}`} style={goal.at_risk ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}>
      {goal.at_risk && (
        <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-warning)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
          <AlertTriangle size={12} />
          AT RISK — underfunded this period
        </div>
      )}

      <div className="goal-ring-wrapper">
        {/* SVG ring */}
        <div className="goal-ring">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle className="goal-ring-bg" cx="48" cy="48" r={RADIUS} strokeWidth="8" />
            <circle
              className="goal-ring-fill"
              cx="48" cy="48" r={RADIUS}
              strokeWidth="8"
              stroke={stroke}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', top: 0, left: 0, width: 96, height: 96 }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)' }}>
              {Math.round(pct * 100)}%
            </span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div className="font-bold" style={{ fontSize: 'var(--text-md)', marginBottom: 4 }}>{goal.name}</div>
          <div className="text-muted text-sm">{fmt.format(goal.current_amount)} of {fmt.format(goal.target_amount)}</div>
          {goal.target_date && (
            <div className="text-xs text-muted mt-2">
              🗓️ Due {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {goal.months_remaining != null && ` · ${goal.months_remaining}mo left`}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mt-4">
        <div className="progress-fill" style={{ width: `${pct * 100}%`, background: stroke }} />
      </div>

      {/* Monthly target */}
      {goal.monthly_needed != null && goal.monthly_needed > 0 && (
        <div className="mt-4 flex justify-between text-xs text-muted">
          <span>Monthly needed</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{fmt.format(goal.monthly_needed)}</span>
        </div>
      )}

      <div className="flex gap-2 mt-5">
        {onEdit && (
          <button id={`goal-edit-${goal.id}`} className="btn btn-ghost btn-sm" onClick={() => onEdit(goal)}>
            Edit
          </button>
        )}
        {onDelete && (
          <button id={`goal-delete-${goal.id}`} className="btn btn-danger btn-sm" onClick={() => onDelete(goal.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
