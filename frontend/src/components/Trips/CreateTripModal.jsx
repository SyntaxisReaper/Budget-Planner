import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTrips } from '../../hooks/useTrips.js';
import toast from '../../lib/haptics.js';

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
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'var(--color-surface)', width: '100%', maxWidth: 500, borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>Create Trip</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--color-text-2)' }}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label className="form-label">Trip Name</label>
            <input required type="text" className="form-input" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Goa Weekend" />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Trip Type</label>
              <select className="form-input" name="type" value={formData.type} onChange={handleChange}>
                <option value="group">Group Trip</option>
                <option value="solo">Solo Trip</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 'var(--space-2)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-2)', fontSize: 'var(--text-sm)' }}>
                <input type="checkbox" name="is_international" checked={formData.is_international} onChange={handleChange} />
                International
              </label>
            </div>
          </div>

          <div>
            <label className="form-label">Destination</label>
            <input type="text" className="form-input" name="destination" value={formData.destination} onChange={handleChange} placeholder="e.g. Bangkok, Thailand" />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Start Date</label>
              <input type="date" className="form-input" name="start_date" value={formData.start_date} onChange={handleChange} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">End Date</label>
              <input type="date" className="form-input" name="end_date" value={formData.end_date} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label className="form-label">Overall Budget</label>
            <input type="number" step="0.01" className="form-input" name="budget" value={formData.budget} onChange={handleChange} placeholder="0.00" />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Ticket (Onward)</label>
              <input type="number" step="0.01" className="form-input" name="ticket_price_onward" value={formData.ticket_price_onward} onChange={handleChange} placeholder="Optional ref" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Ticket (Return)</label>
              <input type="number" step="0.01" className="form-input" name="ticket_price_return" value={formData.ticket_price_return} onChange={handleChange} placeholder="Optional ref" />
            </div>
          </div>

          {formData.type === 'group' && (
            <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
              <label className="form-label" style={{ marginBottom: 'var(--space-2)' }}>Participants (excluding you)</label>
              
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
                  className="form-input" 
                  value={newParticipant} 
                  onChange={e => setNewParticipant(e.target.value)} 
                  placeholder="Friend's Name" 
                  onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddParticipant(e); } }}
                />
                <button type="button" className="btn btn-outline" onClick={handleAddParticipant}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      </div>
    </div>
  );
}
