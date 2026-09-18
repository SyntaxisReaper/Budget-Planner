import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Plane, MapPin, Calendar, Users, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTrips } from '../hooks/useTrips.js';
import CreateTripModal from '../components/Trips/CreateTripModal.jsx';
import { formatCurrency } from '../lib/utils.js';

export default function Trips() {
  const navigate = useNavigate();
  const { query: { data: trips, isLoading } } = useTrips();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const filteredTrips = trips?.filter(t => {
    if (activeTab === 'active') return t.status === 'planned' || t.status === 'active';
    return t.status === 'completed';
  }) || [];

  return (
    <div className="page">
      <header className="page-header" style={{ marginBottom: 'var(--space-4)' }}>
        <h1 className="page-title">Trips</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> New Trip
        </button>
      </header>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <button
          className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('active')}
          style={{ flex: 1 }}
        >
          Active & Planned
        </button>
        <button
          className={`btn ${activeTab === 'completed' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('completed')}
          style={{ flex: 1 }}
        >
          Completed
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--color-text-3)', textAlign: 'center', marginTop: 40 }}>Loading trips...</p>
      ) : filteredTrips.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          padding: 'var(--space-8)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          color: 'var(--color-text-2)'
        }}>
          <Plane size={48} style={{ opacity: 0.2, margin: '0 auto var(--space-4)' }} />
          <p>No trips found in this tab.</p>
          <button 
            className="btn btn-outline" 
            style={{ marginTop: 'var(--space-4)' }}
            onClick={() => setShowCreateModal(true)}
          >
            Start Planning
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredTrips.map(trip => (
            <div
              key={trip.id}
              onClick={() => navigate(`/trips/${trip.id}`)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {trip.type === 'group' ? <Users size={16} color="var(--color-primary)" /> : <Plane size={16} color="var(--color-primary)" />}
                  {trip.name}
                </h3>
                {trip.status === 'completed' && <CheckCircle2 size={16} color="var(--color-success)" />}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-2)' }}>
                {trip.destination && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} /> {trip.destination} {trip.is_international && '(Intl)'}
                  </div>
                )}
                {(trip.start_date || trip.end_date) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} /> 
                    {trip.start_date ? format(new Date(trip.start_date), 'MMM d') : '?'} - {trip.end_date ? format(new Date(trip.end_date), 'MMM d') : '?'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Budget: {formatCurrency(trip.budget)}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', background: 'var(--color-bg)', padding: '4px 8px', borderRadius: 'var(--radius)', color: 'var(--color-text-2)' }}>
                  {trip.type === 'group' ? 'Group Trip' : 'Solo Trip'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && <CreateTripModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
