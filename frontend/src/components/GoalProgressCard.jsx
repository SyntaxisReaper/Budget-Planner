import { impactLight } from '../lib/haptics.js';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { itemVariants, hoverCard, tapCard , tapFeedback } from '../lib/motion.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function GoalProgressCard({ goal, onEdit, onDelete }) {
  const pct = Math.min(1, Number(goal.current_amount) / Math.max(1, Number(goal.target_amount)));
  const dashOffset = CIRCUMFERENCE * (1 - pct);
  const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));

  const stroke = pct >= 1 ? 'var(--color-success)' : pct > 0.5 ? 'var(--color-success)' : 'var(--color-text)';

  return (
    <motion.div
      className={`card ${goal.at_risk ? 'at-risk-card' : ''}`}
      style={goal.at_risk ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}
      variants={itemVariants}
      whileHover={hoverCard}
      whileTap={tapFeedback} onTapStart={impactLight}
      layout
    >
      {goal.at_risk && (
        <motion.div
          className="flex items-center gap-2 mb-4"
          style={{ color: 'var(--color-warning)', fontSize: 'var(--text-xs)', fontWeight: 600 }}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
        >
          <AlertTriangle size={12} />
          AT RISK — underfunded this period
        </motion.div>
      )}

      <div className="goal-ring-wrapper">
        {/* Animated SVG ring */}
        <div className="goal-ring">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle className="goal-ring-bg" cx="48" cy="48" r={RADIUS} strokeWidth="8" />
            <motion.circle
              className="goal-ring-fill"
              cx="48" cy="48" r={RADIUS}
              strokeWidth="8"
              stroke={stroke}
              strokeDasharray={CIRCUMFERENCE}
              strokeLinecap="round"
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', top: 0, left: 0, width: 96, height: 96 }}>
            <motion.span
              style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            >
              {Math.round(pct * 100)}%
            </motion.span>
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

      {/* Animated progress bar */}
      <div className="progress-bar mt-4">
        <motion.div
          className="progress-fill"
          style={{ background: stroke }}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
        />
      </div>

      {goal.monthly_needed != null && goal.monthly_needed > 0 && (
        <motion.div
          className="mt-4 flex justify-between text-xs text-muted"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        >
          <span>Monthly needed</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{fmt.format(goal.monthly_needed)}</span>
        </motion.div>
      )}

      <div className="flex gap-2 mt-5">
        {onEdit && (
          <motion.button id={`goal-edit-${goal.id}`} className="btn btn-ghost btn-sm" onClick={() => onEdit(goal)} whileHover={{ scale: 1.05 }} whileTap={tapFeedback} onTapStart={impactLight}>
            Edit
          </motion.button>
        )}
        {onDelete && (
          <motion.button id={`goal-delete-${goal.id}`} className="btn btn-danger btn-sm" onClick={() => onDelete(goal.id)} whileHover={{ scale: 1.05 }} whileTap={tapFeedback} onTapStart={impactLight}>
            Delete
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
