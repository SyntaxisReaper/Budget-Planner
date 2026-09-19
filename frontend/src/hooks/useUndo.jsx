import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { impactMedium } from '../lib/haptics.js';

export function useUndoableAction() {
  const queryClient = useQueryClient();

  const executeUndoable = (id, queryKey, actionFn, successMsg = 'Deleted') => {
    const previousData = queryClient.getQueryData(queryKey);

    // Optimistically hide
    queryClient.setQueryData(queryKey, (old) => {
      if (!old) return old;
      if (Array.isArray(old)) return old.filter(i => i.id !== id);
      if (old.data) return { ...old, data: old.data.filter(i => i.id !== id) };
      return old;
    });

    let isUndone = false;

    toast((t) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>{successMsg}</span>
        <button 
          onClick={() => {
            isUndone = true;
            impactMedium();
            toast.dismiss(t.id);
            queryClient.setQueryData(queryKey, previousData); // Restore
          }}
          style={{ 
            background: 'var(--color-surface-3)', 
            border: '1px solid var(--color-border)', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            color: 'var(--color-text)'
          }}
        >
          Undo
        </button>
      </div>
    ), { duration: 4000 });

    setTimeout(async () => {
      if (!isUndone) {
        try {
          await actionFn(id);
        } catch (err) {
          queryClient.setQueryData(queryKey, previousData); // Revert on error
        }
      }
    }, 4500);
  };

  return { executeUndoable };
}
