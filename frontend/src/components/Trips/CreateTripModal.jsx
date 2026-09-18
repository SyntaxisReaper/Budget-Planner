import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTrips } from '../../hooks/useTrips.js';
import toast from '../../lib/haptics.js';
import { motion } from 'framer-motion';
import { backdropVariants, modalVariants } from '../../lib/motion.js';

export default function CreateTripModal({ onClose }) {
  const { createMutation } = useTrips();
  const [formData, setFormData] = useState({
    name: '',
    type: 'group',
    is_international: false,
    destination: '',
    budget: '',
    ticket_price_onward: '',
    ticket_price_return: '',
    start_date: '',
    end_date: ''
  });
  
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddParticipant = (e) => {
    e.preventDefault();
    if (!newParticipant.trim()) return;
    setParticipants(prev => [...prev, { name: newParticipant.trim() }]);
    setNewParticipant('');
  };

  const removeParticipant = (index) => {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        ...formData,
        budget: Number(formData.budget) || 0,
        ticket_price_onward: formData.ticket_price_onward ? Number(formData.ticket_price_onward) : null,
        ticket_price_return: formData.ticket_price_return ? Number(formData.ticket_price_return) : null,
        participants
      });
      toast.success('Trip created');
      onClose();
    } catch (error) {
      toast.error('Failed to create trip');
    }
  };

  return (
    <motion.div className="modal-overlay" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}>
      <motion.div className="modal" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}
        drag={window.innerWidth <= 768 ? "y" : false} dragConstraints={{ top: 0, bottom: 0 }} onDragEnd={(e, info) => { if (info.offset.y > 100) onClose(); }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Create Trip</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--color-text-2)' }}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="label">Trip Name</label>
            <input required type="text" className="input" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Goa Weekend" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Trip Type</label>
              <select className="select" name="type" value={formData.type} onChange={handleChange}>
                <option value="group">Group Trip</option>
                <option value="solo">Solo Trip</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '28px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                <input type="checkbox" name="is_international" checked={formData.is_international} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                International
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Destination</label>
            <input type="text" className="input" name="destination" value={formData.destination} onChange={handleChange} placeholder="e.g. Bangkok, Thailand" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Start Date</label>
              <input type="date" className="input" name="start_date" value={formData.start_date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="label">End Date</label>
              <input type="date" className="input" name="end_date" value={formData.end_date} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Overall Budget</label>
            <input type="number" step="0.01" className="input" name="budget" value={formData.budget} onChange={handleChange} placeholder="0.00" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Ticket (Onward)</label>
              <input type="number" step="0.01" className="input" name="ticket_price_onward" value={formData.ticket_price_onward} onChange={handleChange} placeholder="Optional ref" />
            </div>
            <div className="form-group">
              <label className="label">Ticket (Return)</label>
              <input type="number" step="0.01" className="input" name="ticket_price_return" value={formData.ticket_price_return} onChange={handleChange} placeholder="Optional ref" />
            </div>
          </div>

          {formData.type === 'group' && (
            <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
              <label className="label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>Participants (excluding you)</label>
              
              {participants.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-4) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {participants.map((p, i) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 'var(--radius)' }}>
                      <span style={{ fontSize: 'var(--text-sm)' }}>{p.name}</span>
                      <button type="button" onClick={() => removeParticipant(i)} style={{ background: 'transparent', color: 'var(--color-error)' }}>
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input 
                  type="text" 
                  className="input" 
                  value={newParticipant} 
                  onChange={e => setNewParticipant(e.target.value)} 
                  placeholder="Friend's Name" 
                  onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddParticipant(e); } }}
                />
                <button type="button" className="btn btn-outline" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }} onClick={handleAddParticipant}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 'var(--space-4)' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
