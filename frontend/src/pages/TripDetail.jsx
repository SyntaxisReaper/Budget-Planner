import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plane, Users, Plus, ArrowLeft, ArrowRightLeft, CheckCircle2, Trash2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useTrip, useTripTransactions, useTripSettlement } from '../hooks/useTrips.js';
import { useContacts } from '../hooks/useBudget.js';
import LogTripTransactionModal from '../components/Trips/LogTripTransactionModal.jsx';
import { formatCurrency } from '../lib/utils.js';
import toast from '../lib/haptics.js';

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { query: tripQuery, completeMutation } = useTrip(id);
  const { query: txQuery, deleteMutation } = useTripTransactions(id);
  const { query: settlementQuery } = useTripSettlement(id);
  const { query: contactsQuery, create: createContact } = useContacts();

  const [showLogModal, setShowLogModal] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions'); // transactions | settlement
  const [selectedContact, setSelectedContact] = useState('');
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  if (tripQuery.isLoading) {
    return <div className="page"><p>Loading trip details...</p></div>;
  }

  const trip = tripQuery.data;
  if (!trip) {
    return <div className="page"><p>Trip not found.</p></div>;
  }

  const transactions = txQuery.data || [];
  const settlement = settlementQuery.data || { total_spend: 0, balances: [], payments: [] };
  
  // Exclude tickets from the group progress bar? Actually spec says tickets are budget references only, never part of the pool.
  // Wait, does the budget include the tickets? Usually "overall trip budget" includes tickets.
  // We'll show total_spend from transactions, and also show tickets separately.
  const totalSpend = settlement.total_spend || 0;
  const ticketsTotal = (Number(trip.ticket_price_onward) || 0) + (Number(trip.ticket_price_return) || 0);
  const totalCost = totalSpend + ticketsTotal;
  const budget = Number(trip.budget) || 0;
  const progressPct = budget > 0 ? Math.min((totalCost / budget) * 100, 100) : 0;

  const handleComplete = async () => {
    if (window.confirm('Are you sure you want to complete this trip? This will lock in the settlement.')) {
      try {
        await completeMutation.mutateAsync();
        toast.success('Trip completed!');
      } catch (e) {
        toast.error('Failed to complete trip');
      }
    }
  };

  const handleDeleteTx = async (txId) => {
    if (window.confirm('Delete this transaction?')) {
      try {
        await deleteMutation.mutateAsync(txId);
        toast.success('Deleted');
      } catch (e) {
        toast.error('Failed to delete');
      }
    }
  };

  return (
    <div className="page" style={{ paddingBottom: '80px' }}>
      <header className="page-header" style={{ marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/trips')} style={{ padding: '0 8px', marginLeft: '-8px', color: 'var(--color-text-2)' }}>
          <ArrowLeft size={20} style={{ marginRight: 4 }} /> Back to Trips
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {trip.type === 'group' ? <Users color="var(--color-primary)" /> : <Plane color="var(--color-primary)" />}
            {trip.name}
          </h1>
          {trip.status !== 'completed' && (
            <button className="btn btn-primary" onClick={() => setShowLogModal(true)}>
              <Plus size={18} /> Log
            </button>
          )}
        </div>
      </header>

      {/* Overview Card */}
      <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <span style={{ color: 'var(--color-text-2)', fontSize: 'var(--text-sm)' }}>Overall Budget</span>
          <span style={{ fontWeight: 600 }}>{formatCurrency(budget)}</span>
        </div>
        
        <div style={{ height: 12, background: 'var(--color-bg)', borderRadius: 6, overflow: 'hidden', marginBottom: 'var(--space-2)' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct > 90 ? 'var(--color-error)' : 'var(--color-primary)', transition: 'width 0.3s ease' }} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
          <span>Spend: {formatCurrency(totalCost)}</span>
          <span style={{ color: 'var(--color-text-3)' }}>Remaining: {formatCurrency(budget - totalCost)}</span>
        </div>

        {ticketsTotal > 0 && (
          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px dashed var(--color-border)', fontSize: 'var(--text-xs)', color: 'var(--color-text-2)' }}>
            Includes ticket costs: {formatCurrency(ticketsTotal)}
          </div>
        )}
      </div>

      {trip.type === 'group' && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <button className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('transactions')} style={{ flex: 1 }}>
            Transactions
          </button>
          <button className={`btn ${activeTab === 'settlement' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('settlement')} style={{ flex: 1 }}>
            Settlement
          </button>
        </div>
      )}

      {activeTab === 'transactions' ? (
        <div>
          {txQuery.isLoading ? <p>Loading...</p> : transactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-3)', marginTop: 40 }}>No transactions logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {transactions.map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontWeight: 500 }}>{tx.description}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)' }}>
                      Paid by {tx.trip_participants?.name} • {format(new Date(tx.occurred_at), 'MMM d, h:mm a')}
                    </span>
                    {tx.linked_transaction_id && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <ArrowRightLeft size={12} /> Synced to personal ledger
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(tx.amount)}</span>
                    {trip.status !== 'completed' && (
                      <button onClick={() => handleDeleteTx(tx.id)} style={{ color: 'var(--color-error)', background: 'transparent' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {trip.type === 'group' && trip.status !== 'completed' && !showAddParticipant && (
            <button className="btn btn-outline" style={{ width: '100%', marginTop: 'var(--space-4)' }} onClick={() => setShowAddParticipant(true)}>
              + Add Participant
            </button>
          )}

          {/* Add Participant Area */}
          {showAddParticipant && (
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
              <select 
                className="select" 
                value={selectedContact} 
                onChange={e => setSelectedContact(e.target.value)} 
                style={{ flex: 1 }}
              >
                <option value="" disabled>Select a friend...</option>
                {contactsQuery.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="NEW">+ Create New Contact</option>
              </select>
              <button className="btn btn-primary" onClick={async () => {
                if (!selectedContact) return;
                
                let pid = selectedContact;
                if (pid === 'NEW') {
                  const inputName = prompt("Enter new friend's name:");
                  if (!inputName) {
                    setSelectedContact('');
                    return;
                  }
                  try {
                    const newContact = await createContact.mutateAsync({ name: inputName });
                    pid = newContact.id;
                  } catch (err) {
                    toast.error('Failed to create contact');
                    return;
                  }
                }
                
                try {
                  const { supabase } = await import('../lib/supabaseClient.js');
                  const { data: { session } } = await supabase.auth.getSession();
                  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/trips/${id}/participants`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json', 
                      'Authorization': `Bearer ${session.access_token}` 
                    },
                    body: JSON.stringify({ person_id: pid })
                  });
                  if (!res.ok) throw new Error('Failed to add participant');
                  tripQuery.refetch();
                  setShowAddParticipant(false);
                  setSelectedContact('');
                } catch (e) {
                  toast.error(e.message);
                }
              }}>Add</button>
            </div>
          )}
        </div>
      ) : (
        <div>
          {trip.status === 'completed' && (
            <div style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--color-success)', padding: 'var(--space-3)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
              <ShieldCheck size={20} /> Snapshot locked and finalized.
            </div>
          )}

          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Balances</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
            {settlement.balances?.map(b => (
              <div key={b.participant_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontWeight: 500 }}>{b.name}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: b.balance > 0 ? 'var(--color-success)' : b.balance < 0 ? 'var(--color-error)' : 'var(--color-text)' }}>
                    {b.balance > 0 ? '+' : ''}{formatCurrency(b.balance)}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                    Paid {formatCurrency(b.paid)} • Share {formatCurrency(b.fair_share)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Simplest Settlement</h3>
          {settlement.payments?.length === 0 ? (
            <p style={{ color: 'var(--color-text-3)' }}>Everyone is settled up!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              {settlement.payments?.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
                  <span style={{ fontWeight: 600, flex: 1, textAlign: 'right' }}>{p.from}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--color-text-3)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text)' }}>{formatCurrency(p.amount)}</span>
                    <ArrowRightLeft size={16} />
                  </div>
                  <span style={{ fontWeight: 600, flex: 1 }}>{p.to}</span>
                </div>
              ))}
            </div>
          )}

          {trip.status !== 'completed' && trip.type === 'group' && (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleComplete} disabled={completeMutation.isPending}>
              {completeMutation.isPending ? 'Completing...' : 'Complete Trip & Lock Settlement'}
            </button>
          )}
        </div>
      )}

      {showLogModal && <LogTripTransactionModal trip={trip} onClose={() => setShowLogModal(false)} />}
    </div>
  );
}
