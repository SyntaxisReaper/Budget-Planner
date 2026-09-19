import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, message, actionLabel, onAction }) {
  return (
    <motion.div 
      className="empty-state"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
        background: 'var(--color-surface-2)',
        borderRadius: '16px',
        border: '1px dashed var(--color-border)',
        marginTop: '24px'
      }}
    >
      <div style={{
        background: 'var(--color-surface-3)',
        padding: '16px',
        borderRadius: '50%',
        marginBottom: '16px'
      }}>
        <Icon size={32} color="var(--color-text-3)" />
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{title}</h3>
      <p style={{ color: 'var(--color-text-3)', fontSize: '14px', marginBottom: '24px', maxWidth: '260px' }}>
        {message}
      </p>
      {onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
