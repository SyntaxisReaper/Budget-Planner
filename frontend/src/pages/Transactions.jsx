import { useState, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { Plus, Filter, ArrowRightLeft, Banknote } from 'lucide-react';
import { useTransactions, useItems, useAccounts, useDebts, useGoals, useSettings, useCategorizationTrainingData } from '../hooks/useBudget.js';
import { trainCategorizer, predictCategory } from '../lib/categorization.js';
import { computeCycleBounds } from '../lib/dateUtils.js';
import toast, { impactLight } from '../lib/haptics.js';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { motion, AnimatePresence } from 'framer-motion';
import PullToRefresh from '../components/PullToRefresh.jsx';
import CurrencyInput from '../components/CurrencyInput.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { useUndoableAction } from '../hooks/useUndo.jsx';
import { staggerContainer, itemVariants, fadeUp, backdropVariants, modalVariants , tapFeedback } from '../lib/motion.js';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function toLocalDatetimeString(date) {
  const tzoffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
  return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
}

function AddTransactionModal({ items, accounts, debts, goals, wordFreq, onClose, onCreate, onTransfer }) {
  const [form, setForm] = useState({
    account_id: accounts.length > 0 ? accounts[0].id : '',
    type: 'expense',
    amount: '',
    occurred_at: toLocalDatetimeString(new Date()),
    item_id: '',
    debt_id: '',
    goal_id: '',
    to_account_id: '',
    utr_id: '',
    note: ''
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleTextChange = (field, value) => {
    setForm((p) => {
      const next = { ...p, [field]: value };
      const combinedText = `${next.note || ''} ${next.utr_id || ''}`.trim();
      
      // Predict category only if expense and no explicit item is selected yet
      if (combinedText.length >= 3 && next.type === 'expense' && !p.item_id) {
        const predictedItemId = predictCategory(combinedText, wordFreq);
        if (predictedItemId) {
          next.item_id = predictedItemId;
        }
      }
      return next;
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.account_id) return toast.error('Please select an account');
    
    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        occurred_at: new Date(form.occurred_at).toISOString(),
        utr_id: form.utr_id || undefined,
        note: form.note || undefined,
      };

      if (form.type === 'transfer_out') {
        if (!form.to_account_id) throw new Error('Please select destination account');
        if (form.account_id === form.to_account_id) throw new Error('Cannot transfer to same account');
        await onTransfer({
          from_account_id: form.account_id,
          to_account_id: form.to_account_id,
          ...payload
        });
      } else {
        payload.account_id = form.account_id;
        payload.type = form.type;
        if (form.type === 'expense' && form.item_id) payload.item_id = form.item_id;
        if (form.type === 'debt_payment') {
          if (!form.debt_id) throw new Error('Please select a debt/rent');
          payload.debt_id = form.debt_id;
        }
        if (form.type === 'goal_contribution') {
          if (!form.goal_id) throw new Error('Please select a goal');
          payload.goal_id = form.goal_id;
        }
        await onCreate(payload);
      }
      
      toast.success(form.type === 'transfer_out' ? 'Transfer completed!' : 'Transaction logged!');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="modal-overlay"
      variants={backdropVariants} initial="hidden" animate="visible" exit="exit"
      onClick={onClose}
    >
      <motion.div
        className="modal"
        variants={modalVariants} initial="hidden" animate="visible" exit="exit"
        onClick={(e) => e.stopPropagation()}
        drag={window.innerWidth <= 768 ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={(e, info) => { if (info.offset.y > 100) onClose(); }}
      >
        <h2 className="modal-title">➕ Log Transaction</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Account</label>
            <select className="select" value={form.account_id} onChange={(e) => set('account_id', e.target.value)} required>
              <option value="">— select account —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt.format(a.current_balance)})</option>)}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Type</label>
              <select className="select" value={form.type} onChange={(e) => {
                set('type', e.target.value);
                set('item_id', ''); set('debt_id', ''); set('goal_id', ''); set('to_account_id', '');
              }}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer_out">Transfer</option>
                <option value="debt_payment">Debt / Rent Payment</option>
                <option value="goal_contribution">Goal Contribution</option>
              </select>
            </div>
            <div className="form-group">
            <label className="label">Amount (₹)</label>
            <CurrencyInput className="input text-xl font-bold" placeholder="0.00" value={form.amount} onChange={(v) => set('amount', v)} required />
          </div>
          </div>

          {form.type === 'expense' && (
            <div className="form-group">
              <label className="label">Item (optional)</label>
              <select className="select" value={form.item_id} onChange={(e) => set('item_id', e.target.value)}>
                <option value="">— none —</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          )}

          {form.type === 'transfer_out' && (
            <div className="form-group">
              <label className="label">To Account</label>
              <select className="select" value={form.to_account_id} onChange={(e) => set('to_account_id', e.target.value)} required>
                <option value="">— select destination —</option>
                {accounts.filter(a => a.id !== form.account_id).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {form.type === 'debt_payment' && (
            <div className="form-group">
              <label className="label">Debt / Rent</label>
              <select className="select" value={form.debt_id} onChange={(e) => set('debt_id', e.target.value)} required>
                <option value="">— select —</option>
                {debts.map((d) => <option key={d.id} value={d.id}>{d.name} (rem: {fmt.format(d.remaining_balance)})</option>)}
              </select>
            </div>
          )}

          {form.type === 'goal_contribution' && (
            <div className="form-group">
              <label className="label">Goal</label>
              <select className="select" value={form.goal_id} onChange={(e) => set('goal_id', e.target.value)} required>
                <option value="">— select —</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="label">Date & Time</label>
              <input type="datetime-local" className="input" required value={form.occurred_at} onChange={(e) => set('occurred_at', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">UTR / Ref (optional)</label>
              <input type="text" className="input" placeholder="e.g. UPI Ref" value={form.utr_id} onChange={(e) => handleTextChange('utr_id', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Note</label>
            <input type="text" className="input" placeholder="Optional note…" value={form.note} onChange={(e) => handleTextChange('note', e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Log Transaction'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function Transactions() {
  const queryClient = useQueryClient();
  const { executeUndoable } = useUndoableAction();
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [showModal, setShowModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [parent] = useAutoAnimate();

  const { data: settings } = useSettings();
  const { start: cycleStart, end: cycleEnd } = computeCycleBounds(month, settings?.data || settings);

  const trainingQuery = useCategorizationTrainingData();
  const wordFreq = useMemo(() => trainCategorizer(trainingQuery.data), [trainingQuery.data]);

  const { query, create, remove } = useTransactions({ from: cycleStart, to: cycleEnd });
  const { query: itemsQuery } = useItems();
  const { query: accountsQuery, transfer } = useAccounts();
  const { query: debtsQuery } = useDebts();
  const { query: goalsQuery } = useGoals();

  const transactions = query.data || [];
  const items = itemsQuery.data || [];
  const accounts = accountsQuery.data?.filter(a => a.is_active) || [];
  const debts = debtsQuery.data?.filter(d => d.status === 'active') || [];
  const goals = goalsQuery.data || [];
  
  // Map entities for table display
  const accountMap = useMemo(() => Object.fromEntries((accountsQuery.data || []).map(a => [a.id, a])), [accountsQuery.data]);
  const itemMap = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items]);
  const debtMap = useMemo(() => Object.fromEntries((debtsQuery.data || []).map(d => [d.id, d])), [debtsQuery.data]);
  const goalMap = useMemo(() => Object.fromEntries(goals.map(g => [g.id, g])), [goals]);

  const filtered = transactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (accountFilter !== 'all' && t.account_id !== accountFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNote = t.note?.toLowerCase().includes(q);
      const matchUtr = t.utr_id?.toLowerCase().includes(q);
      const targetName = (
        (t.type === 'expense' && (t.items?.name || itemMap[t.item_id]?.name)) ||
        (t.type === 'debt_payment' && (t.debts?.name || debtMap[t.debt_id]?.name)) ||
        (t.type === 'goal_contribution' && (t.goals?.name || goalMap[t.goal_id]?.name)) ||
        (t.type === 'expense' && !t.item_id && t.note?.startsWith('Auto-payment: ') ? t.note.replace('Auto-payment: ', 'Subscription: ') : '') ||
        ''
      ).toLowerCase();
      if (!matchNote && !matchUtr && !targetName.includes(q)) return false;
    }
    return true;
  });

  // Quick summary for cycle
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  async function handleDelete(id) {
    executeUndoable(id, ['transactions', cycleStart, cycleEnd], async (tid) => {
      await remove.mutateAsync(tid);
      // Let backend catch up
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }, 'Transaction deleted');
  }

  function renderTarget(t) {
    if (t.type === 'expense' && t.item_id) return t.items?.name || itemMap[t.item_id]?.name || 'Item';
    if (t.type === 'debt_payment' && t.debt_id) return t.debts?.name || debtMap[t.debt_id]?.name || 'Debt';
    if (t.type === 'goal_contribution' && t.goal_id) return t.goals?.name || goalMap[t.goal_id]?.name || 'Goal';
    if (t.type === 'expense' && !t.item_id && t.note?.startsWith('Auto-payment: ')) {
      return <span className="text-primary font-medium">{t.note.replace('Auto-payment: ', 'Subscription: ')}</span>;
    }
    return <span className="text-muted">—</span>;
  }

  return (
    <PullToRefresh onRefresh={async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }}>
    <div className="page" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <motion.div className="page-header flex items-center justify-between" variants={fadeUp} initial="hidden" animate="visible">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">
            {settings && (settings.data?.cycle_start_date || settings.cycle_start_date)
              ? `Cycle: ${new Date(cycleStart).toLocaleDateString()} — ${new Date(cycleEnd).toLocaleDateString()}` 
              : 'The unified ledger for all balances'}
          </p>
        </div>
        <motion.button className="btn btn-primary" onClick={() => setShowModal(true)} whileHover={{ scale: 1.04 }} whileTap={tapFeedback} onTapStart={impactLight}>
          <Plus size={16} /> Log Transaction
        </motion.button>
      </motion.div>

      {/* Summary row */}
      <motion.div className="grid-3 mb-6" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card stat-card" variants={itemVariants} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
          <div className="stat-label">Cycle Income</div>
          <div className="stat-value positive">{fmt.format(totalIncome)}</div>
        </motion.div>
        <motion.div className="card stat-card" variants={itemVariants} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
          <div className="stat-label">Cycle Expenses</div>
          <div className="stat-value negative">{fmt.format(totalExpenses)}</div>
        </motion.div>
        <motion.div className="card stat-card" variants={itemVariants} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
          <div className="stat-label">Net</div>
          <div className={`stat-value ${totalIncome - totalExpenses >= 0 ? 'positive' : 'negative'}`}>
            {fmt.format(totalIncome - totalExpenses)}
          </div>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between mb-5" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
            <div className="flex items-center gap-2">
              <Filter size={14} color="var(--color-text-3)" />
              <span className="text-sm text-muted">Filters:</span>
            </div>
            <input type="month" className="input" style={{ width: 'auto' }}
              value={month} onChange={(e) => setMonth(e.target.value)} />
            <select className="select" style={{ width: 'auto' }}
              value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="debt_payment">Debt / Rent Payment</option>
              <option value="goal_contribution">Goal Contribution</option>
            </select>
            <select className="select" style={{ width: 'auto' }}
              value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
              <option value="all">All accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <input type="text" className="input" placeholder="Search note, category, UTR..." style={{ minWidth: 250 }}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {query.isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState 
            icon={Banknote}
            title="No Transactions" 
            message="No transactions found for this period." 
            actionLabel="Log a Transaction"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="table-wrap" style={{ height: 'calc(100vh - 380px)', minHeight: 400 }}>
            <TableVirtuoso
              data={filtered}
              fixedHeaderContent={() => (
                <tr>
                  <th>Date & Time</th>
                  <th>Account</th>
                  <th>Category / Target</th>
                  <th>Type</th>
                  <th>Note / UTR</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              )}
              itemContent={(_index, t) => (
                <>
                  <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(t.occurred_at).toLocaleString(undefined, { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </td>
                  <td>{accountMap[t.account_id]?.name || '—'}</td>
                  <td>{renderTarget(t)}</td>
                  <td>
                    <span className={`badge ${
                      t.type === 'income' || t.type === 'transfer_in' ? 'badge-success' : 
                      (t.type === 'expense' || t.type === 'transfer_out' ? 'badge-danger' : 'badge-important')
                    }`}>
                      {t.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {t.note}
                    {t.note && t.utr_id && ' · '}
                    {t.utr_id && <span style={{ fontFamily: 'monospace' }}>UTR: {t.utr_id}</span>}
                  </td>
                  <td style={{ 
                    textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap',
                    color: (t.type === 'income' || t.type === 'transfer_in') ? 'var(--color-success)' : 'var(--color-text)' 
                  }}>
                    {(t.type === 'income' || t.type === 'transfer_in') ? '+' : '-'}{fmt.format(t.amount)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-icon btn-ghost btn-sm text-muted hover:text-danger" onClick={() => handleDelete(t.id)}>
                      ×
                    </button>
                  </td>
                </>
              )}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <AddTransactionModal 
            items={items} 
            accounts={accounts}
            debts={debts}
            goals={goals}
            wordFreq={wordFreq}
            onClose={() => setShowModal(false)} 
            onCreate={create.mutateAsync} 
            onTransfer={transfer.mutateAsync}
          />
        )}
      </AnimatePresence>
    </div>
    </PullToRefresh>
  );
}
