import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient.js';
import { Link2, Plus, Trash2 } from 'lucide-react';
import toast from '../lib/haptics.js';
import { motion } from 'framer-motion';
import { itemVariants } from '../lib/motion.js';

// Reusable component to show and add links for ANY module
export default function Links({ entityType, entityId }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [targetType, setTargetType] = useState('trip');
  const [targetId, setTargetId] = useState('');

  // Fetch all links where THIS entity is the source
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['links', entityType, entityId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/links?from_type=${entityType}&from_id=${entityId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch links');
      return res.json();
    }
  });

  // Fetch available targets to link TO based on selected type
  const { data: targets = [] } = useQuery({
    queryKey: ['linkTargets', targetType],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let endpoint = targetType;
      if (targetType === 'trip') endpoint = 'trips';
      if (targetType === 'debt') endpoint = 'people-ledger';
      if (targetType === 'goal') endpoint = 'goals';
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      
      return data.map(item => ({
        id: item.id,
        name: item.name || item.title || (item.people ? `${item.direction === 'lent' ? 'Lent to' : 'Borrowed from'} ${item.people.name} (${item.amount})` : 'Unknown')
      }));
    },
    enabled: showAdd
  });

  const createMutation = useMutation({
    mutationFn: async (linkData) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/links`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify(linkData)
      });
      if (!res.ok) throw new Error('Failed to create link');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', entityType, entityId] });
      toast.success('Linked successfully');
      setShowAdd(false);
      setTargetId('');
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (linkId) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/links/${linkId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to delete link');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', entityType, entityId] });
      toast.success('Link removed');
    }
  });

  const handleAddLink = () => {
    if (!targetId) return;
    createMutation.mutate({
      from_type: entityType,
      from_id: entityId,
      to_type: targetType,
      to_id: targetId
    });
  };

  return (
    <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link2 size={16} /> Attached Links
        </h4>
        <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setShowAdd(!showAdd)}>
          <Plus size={16} />
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted">Loading...</p>
      ) : links.length === 0 && !showAdd ? (
        <p className="text-xs text-muted">No links attached.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {links.map(link => (
            <div key={link.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: 'var(--color-bg)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)' }}>
              <span style={{ textTransform: 'capitalize' }}>
                {link.to_type} connection
              </span>
              <button style={{ color: 'var(--color-error)', background: 'transparent', padding: 4 }} onClick={() => deleteMutation.mutate(link.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <motion.div variants={itemVariants} initial="hidden" animate="visible" style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <select className="select" value={targetType} onChange={e => { setTargetType(e.target.value); setTargetId(''); }}>
            <option value="trip">Trip</option>
            <option value="debt">Debt / IOU</option>
            <option value="goal">Goal</option>
          </select>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <select className="select" value={targetId} onChange={e => setTargetId(e.target.value)} style={{ flex: 1 }}>
              <option value="" disabled>Select {targetType}...</option>
              {targets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={handleAddLink} disabled={!targetId || createMutation.isPending}>
              {createMutation.isPending ? '...' : 'Add'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
