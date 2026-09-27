import { useContactHistory } from '../hooks/useBudget.js';
import { motion } from 'framer-motion';
import { X, Send, Calendar, CheckCircle, Share2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils.js';
import { format } from 'date-fns';
import { backdropVariants, modalVariants } from '../lib/motion.js';

export default function ContactHistoryModal({ contact, onClose }) {
  const { data, isLoading } = useContactHistory(contact.id);
  
  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 bg-bg z-50 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const { ledger, trips, settlements, summary } = data;
  const baseUrl = import.meta.env.VITE_FRONTEND_URL || 'https://budget-planner-f5qb.onrender.com';

  return (
    <motion.div 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }} 
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <header className="px-4 py-4 flex items-center gap-3 border-b border-border bg-[var(--color-surface)]">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-2)]"><X size={20} /></button>
        <div>
          <h2 className="font-bold text-lg leading-tight text-[var(--color-text)]">{contact.name}</h2>
          <div className="text-xs text-muted">Transaction History</div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto pb-8 p-4">
        {/* Summary Strip */}
        <div className="flex bg-[var(--color-surface)] rounded-xl p-4 border border-border shadow-sm mb-6 divide-x divide-border">
          <div className="flex-1 text-center px-2">
            <div className="text-xs text-muted mb-1">Lent</div>
            <div className="font-bold text-primary">{formatCurrency(summary.total_lent)}</div>
          </div>
          <div className="flex-1 text-center px-2">
            <div className="text-xs text-muted mb-1">Borrowed</div>
            <div className="font-bold text-error">{formatCurrency(summary.total_borrowed)}</div>
          </div>
          <div className="flex-1 text-center px-2">
            <div className="text-xs text-muted mb-1">Trips</div>
            <div className="font-bold text-[var(--color-text)]">{summary.total_trips}</div>
          </div>
        </div>

        {/* IOUs */}
        <div className="mb-6">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-sm text-[var(--color-text)]"><Send size={16} className="text-muted"/> People Ledger</h3>
          {ledger.length === 0 ? <div className="text-sm text-muted">No direct transactions.</div> : (
            <div className="flex flex-col gap-3">
              {ledger.map(item => (
                <div key={item.id} className="card p-3 flex flex-col gap-2 bg-[var(--color-surface)]">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm text-[var(--color-text)]">{item.note || 'IOU'}</div>
                      <div className="text-xs text-muted mt-0.5">{format(new Date(item.created_at), 'MMM d, yyyy')}</div>
                    </div>
                    <div className={`font-bold ${item.direction === 'lent' ? 'text-primary' : 'text-error'}`}>
                      {item.direction === 'lent' ? '+' : '-'}{formatCurrency(item.amount)}
                    </div>
                  </div>
                  {item.status === 'active' && item.direction === 'lent' && (
                    <button 
                      className="btn btn-sm flex items-center justify-center gap-1 w-full mt-2" 
                      style={{ backgroundColor: '#25D366', color: 'white', border: 'none' }} 
                      onClick={(e) => {
                        e.preventDefault();
                        const msg = `Hey! You owe me ${formatCurrency(item.amount)}. You can pay here: ${baseUrl}/pay/${item.id}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                    >
                      <Share2 size={14} /> Send WhatsApp Reminder
                    </button>
                  )}
                  {item.status === 'settled' && (
                    <div className="text-xs text-primary flex items-center gap-1 mt-1"><CheckCircle size={12}/> Settled</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trips */}
        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2 text-sm text-[var(--color-text)]"><Calendar size={16} className="text-muted"/> Shared Trips</h3>
          {trips.length === 0 ? <div className="text-sm text-muted">No shared trips.</div> : (
            <div className="flex flex-col gap-3">
              {trips.map(tp => {
                const trip = tp.trips;
                const settlement = settlements.find(s => s.trip_id === trip.id);
                return (
                  <div key={tp.id} className="card p-3 bg-[var(--color-surface)]">
                    <div className="font-bold text-sm text-[var(--color-text)]">{trip.name}</div>
                    <div className="flex justify-between items-center text-xs text-muted mt-1">
                      <span>{trip.destination} • {trip.start_date ? format(new Date(trip.start_date), 'MMM d') : ''}</span>
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 bg-[var(--color-surface-2)] rounded">{trip.status}</span>
                    </div>
                    {settlement && (
                      <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs">
                        <div><span className="text-muted">Paid:</span> {formatCurrency(settlement.paid_amount)}</div>
                        <div><span className="text-muted">Share:</span> {formatCurrency(settlement.fair_share)}</div>
                        <div className={`font-bold ${settlement.net_balance > 0 ? 'text-primary' : settlement.net_balance < 0 ? 'text-error' : 'text-[var(--color-text)]'}`}>
                          {settlement.net_balance > 0 ? 'Gets back' : settlement.net_balance < 0 ? 'Owes' : 'Settled'} {formatCurrency(Math.abs(settlement.net_balance))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
