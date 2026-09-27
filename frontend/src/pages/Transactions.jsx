import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TableVirtuoso } from 'react-virtuoso';
import { Plus, Filter, ArrowRightLeft, Banknote, Pencil, ScanLine, Loader2 } from 'lucide-react';
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
import apiClient from '../lib/apiClient.js';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function toLocalDatetimeString(date) {
  const tzoffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
  return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
}

function AddTransactionModal({ items, accounts, debts, goals, wordFreq, onClose, onCreate, onUpdate, onTransfer, initialData, editMode, scanMeta }) {
  const [form, setForm] = useState({
    account_id: initialData?.account_id || (accounts.length > 0 ? accounts[0].id : ''),
    type: initialData?.type || 'expense',
    amount: initialData?.amount ? String(initialData.amount) : '',
    occurred_at: initialData?.occurred_at ? toLocalDatetimeString(new Date(initialData.occurred_at)) : toLocalDatetimeString(new Date()),
    item_id: initialData?.item_id || '',
    debt_id: initialData?.debt_id || '',
    goal_id: initialData?.goal_id || '',
    to_account_id: '',
    utr_id: initialData?.utr_id || '',
    note: initialData?.note || ''
  });

  // Fields locked when pre-filled from a scan (amount, utr_id, occurred_at)
  const scanLocked = !!scanMeta;

  // Multi-item state
  const [multiItems, setMultiItems] = useState(() => {
    if (initialData?.transaction_items?.length > 0) {
      return initialData.transaction_items.map(ti => ({ item_id: ti.item_id, amount: String(ti.amount) }));
    }
    return [];
  });
  const [splitEvenly, setSplitEvenly] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const pickerRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Close item picker on outside click
  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowItemPicker(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleTextChange = (field, value) => {
    setForm((p) => {
      const next = { ...p, [field]: value };
      const combinedText = `${next.note || ''} ${next.utr_id || ''}`.trim();
      
      // Predict category only if expense and no explicit item is selected yet
      if (combinedText.length >= 3 && next.type === 'expense' && !p.item_id && multiItems.length === 0) {
        const predictedItemId = predictCategory(combinedText, wordFreq);
        if (predictedItemId) {
          next.item_id = predictedItemId;
        }
      }
      return next;
    });
  };

  function toggleItemInMulti(itemId) {
    setMultiItems(prev => {
      const exists = prev.find(i => i.item_id === itemId);
      if (exists) return prev.filter(i => i.item_id !== itemId);
      const newList = [...prev, { item_id: itemId, amount: '' }];
      if (splitEvenly && form.amount) {
        const each = (parseFloat(form.amount) / newList.length).toFixed(2);
        return newList.map(i => ({ ...i, amount: each }));
      }
      return newList;
    });
    set('item_id', ''); // Clear single-item when using multi
  }

  function applySplitEvenly() {
    const total = parseFloat(form.amount);
    if (!total || multiItems.length === 0) return;
    const each = (total / multiItems.length).toFixed(2);
    setMultiItems(prev => prev.map(i => ({ ...i, amount: each })));
  }

  function updateItemAmount(itemId, val) {
    setMultiItems(prev => prev.map(i => i.item_id === itemId ? { ...i, amount: val } : i));
  }

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
        // Multi-item takes priority over single-item
        if (form.type === 'expense' && multiItems.length > 1) {
          payload.items = multiItems.map(i => ({ item_id: i.item_id, amount: parseFloat(i.amount) }));
          payload.item_id = null;
        } else if (form.type === 'expense' && form.item_id) {
          payload.item_id = form.item_id;
        } else if (form.type === 'expense' && multiItems.length === 1) {
          payload.item_id = multiItems[0].item_id;
        }
        if (form.type === 'debt_payment') {
          if (!form.debt_id) throw new Error('Please select a debt/rent');
          payload.debt_id = form.debt_id;
        }
        if (form.type === 'goal_contribution') {
          if (!form.goal_id) throw new Error('Please select a goal');
          payload.goal_id = form.goal_id;
        }
        if (editMode) {
          await onUpdate({ id: initialData.id, ...payload });
        } else {
          await onCreate(payload);
        }
      }
      
      toast.success(editMode ? 'Transaction updated!' : (form.type === 'transfer_out' ? 'Transfer completed!' : 'Transaction logged!'));
      onClose();
    } catch (err) {
      // Handle duplicate UTR specifically
      if (err.message?.includes('duplicate_utr') || err.message?.includes('UTR')) {
        toast.error(`⚠️ Already logged: ${err.message}`, { duration: 6000 });
      } else {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedItemNames = multiItems.map(i => items.find(it => it.id === i.item_id)?.name).filter(Boolean);

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
        <h2 className="modal-title">{editMode ? '✏️ Edit Transaction' : (scanMeta ? '📷 Confirm Scanned Receipt' : '➕ Log Transaction')}</h2>

        {/* Scan engine badge */}
        {scanMeta && (
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
              background: scanMeta.engine === 'gemini' || scanMeta.engine === 'gemini+ocr'
                ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
              color: scanMeta.engine === 'gemini' || scanMeta.engine === 'gemini+ocr'
                ? '#60a5fa' : '#34d399',
            }}>
              {scanMeta.engine === 'gemini' || scanMeta.engine === 'gemini+ocr' ? '✦ Scanned via Gemini AI' : '⚙ Scanned via OCR'}
            </span>
            {scanMeta.app_source && scanMeta.app_source !== 'unknown' && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', textTransform: 'capitalize' }}>
                {scanMeta.app_source}
              </span>
            )}
          </div>
        )}

        {/* Low confidence warning */}
        {scanMeta?.low_confidence && (
          <div style={{
            background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)',
            borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 12,
            fontSize: '0.8rem', color: '#fbbf24',
          }}>
            ⚠️ Some fields may need checking — Gemini wasn't fully confident in this scan.
          </div>
        )}

        {/* Duplicate UTR warning */}
        {scanMeta?.existing_transaction && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 12,
            fontSize: '0.8rem', color: '#ef4444',
          }}>
            ⛔ <strong>Duplicate Alert:</strong> A transaction with this UTR is already logged (₹{scanMeta.existing_transaction.amount} on {new Date(scanMeta.existing_transaction.occurred_at).toLocaleDateString('en-IN')}). Saving this will result in double-counting!
          </div>
        )}

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
                setMultiItems([]);
              }} disabled={editMode && ['transfer_in', 'transfer_out'].includes(form.type)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                {!editMode && <option value="transfer_out">Transfer</option>}
                <option value="debt_payment">Debt / Rent Payment</option>
                <option value="goal_contribution">Goal Contribution</option>
              </select>
            </div>
            <div className="form-group">
            <label className="label">Amount (₹)</label>
            <CurrencyInput
              className="input text-xl font-bold"
              placeholder="0.00"
              value={form.amount}
              onChange={(v) => set('amount', v)}
              required
              readOnly={scanLocked && !!form.amount}
              style={scanLocked && form.amount ? { background: 'var(--color-surface-2)', color: 'var(--color-text-2)', cursor: 'not-allowed' } : {}}
            />
          </div>
          </div>

          {form.type === 'expense' && (
            <div className="form-group" ref={pickerRef} style={{ position: 'relative' }}>
              <label className="label">Items (optional)</label>
              <div
                className="select"
                style={{ cursor: 'pointer', minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => setShowItemPicker(v => !v)}
              >
                <span style={{ color: selectedItemNames.length ? 'var(--color-text)' : 'var(--color-text-3)', fontSize: '0.9rem' }}>
                  {selectedItemNames.length > 0 ? selectedItemNames.join(', ') : (form.item_id ? items.find(i => i.id === form.item_id)?.name : '— none —')}
                </span>
                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>▾</span>
              </div>
              {showItemPicker && (
                <div style={{ position: 'absolute', zIndex: 100, top: '100%', left: 0, right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                  <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-3)' }}>
                      <input type="checkbox" checked={!form.item_id && multiItems.length === 0} onChange={() => { setMultiItems([]); set('item_id', ''); }} /> None
                    </label>
                  </div>
                  {items.map(item => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}>
                      <input
                        type="checkbox"
                        checked={multiItems.some(i => i.item_id === item.id) || form.item_id === item.id}
                        onChange={() => {
                          if (multiItems.length === 0 && form.item_id === item.id) {
                            set('item_id', '');
                          } else if (multiItems.length === 0 && !form.item_id) {
                            set('item_id', item.id);
                          } else {
                            // Switch to multi mode
                            if (form.item_id && multiItems.length === 0) {
                              setMultiItems([{ item_id: form.item_id, amount: '' }]);
                              set('item_id', '');
                            }
                            toggleItemInMulti(item.id);
                          }
                        }}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {/* Per-item amount inputs for multi-item */}
              {multiItems.length > 1 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="text-xs text-muted">Split amounts</span>
                    <button type="button" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                      onClick={() => { setSplitEvenly(true); applySplitEvenly(); }}>
                      Split Evenly
                    </button>
                  </div>
                  {multiItems.map(mi => (
                    <div key={mi.item_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: '0.85rem' }}>{items.find(i => i.id === mi.item_id)?.name}</span>
                      <CurrencyInput
                        className="input"
                        style={{ width: 100, textAlign: 'right' }}
                        placeholder="0.00"
                        value={mi.amount}
                        onChange={(v) => updateItemAmount(mi.item_id, v)}
                      />
                    </div>
                  ))}
                  {(() => {
                    const total = parseFloat(form.amount) || 0;
                    const sum = multiItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                    const diff = Math.abs(total - sum);
                    return diff > 0.01 ? <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>⚠ Sum ₹{sum.toFixed(2)} ≠ Total ₹{total.toFixed(2)}</span> : null;
                  })()}
                </div>
              )}
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
              <input
                type="datetime-local"
                className="input"
                required
                value={form.occurred_at}
                onChange={(e) => set('occurred_at', e.target.value)}
                readOnly={scanLocked && !!initialData?.occurred_at}
                style={scanLocked && initialData?.occurred_at ? { background: 'var(--color-surface-2)', color: 'var(--color-text-2)', cursor: 'not-allowed' } : {}}
              />
            </div>
            <div className="form-group">
              <label className="label">UTR / Ref {scanLocked && form.utr_id && <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginLeft: 4 }}>✓ verified</span>}</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. UPI Ref"
                value={form.utr_id}
                onChange={(e) => handleTextChange('utr_id', e.target.value)}
                readOnly={scanLocked && !!form.utr_id}
                style={scanLocked && form.utr_id ? { background: 'var(--color-surface-2)', fontFamily: 'monospace', cursor: 'not-allowed' } : {}}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Note</label>
            <input type="text" className="input" placeholder="Optional note…" value={form.note} onChange={(e) => handleTextChange('note', e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (editMode ? 'Save Changes' : 'Log Transaction')}
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
  const [searchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(searchParams.get('add') === 'true');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [scanData, setScanData] = useState(null);     // pre-filled data from receipt scan
  const [scanMeta, setScanMeta] = useState(null);     // engine/confidence metadata
  const [scanning, setScanning] = useState(false);    // scanning in-progress spinner
  const scanFileInputRef = useRef(null);              // hidden <input type="file">
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [parent] = useAutoAnimate();

  const { data: settings } = useSettings();
  const { start: cycleStart, end: cycleEnd } = computeCycleBounds(month, settings?.data || settings);

  const trainingQuery = useCategorizationTrainingData();
  const wordFreq = useMemo(() => trainCategorizer(trainingQuery.data), [trainingQuery.data]);

  const { query, create, update, remove } = useTransactions({ from: cycleStart, to: cycleEnd });
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
      let targetName = '';
      if (t.type === 'expense' && (t.items?.name || itemMap[t.item_id]?.name)) {
        targetName = t.items?.name || itemMap[t.item_id]?.name;
      } else if (t.type === 'debt_payment' && (t.debts?.name || debtMap[t.debt_id]?.name)) {
        targetName = t.debts?.name || debtMap[t.debt_id]?.name;
      } else if (t.type === 'goal_contribution' && (t.goals?.name || goalMap[t.goal_id]?.name)) {
        targetName = t.goals?.name || goalMap[t.goal_id]?.name;
      } else if (t.type === 'expense' && !t.item_id && t.note?.startsWith('Auto-payment: ')) {
        targetName = t.note.replace('Auto-payment: ', 'Subscription: ');
      }
      targetName = targetName.toLowerCase();
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }, 'Transaction deleted');
  }

  // ── Scan Receipt ──────────────────────────────────────────────────────────
  async function uploadAndScan(file) {
    setScanning(true);
    try {
      const form = new FormData();
      form.append('receipt', file, file.name);
      const result = await apiClient.post('/receipts/scan', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Build initialData for the modal
      setScanData({
        type: 'expense',
        amount:      result.amount      ?? '',
        occurred_at: result.occurred_at ?? new Date().toISOString(),
        utr_id:      result.utr_id      ?? '',
        note:        result.note        ?? '',
      });
      setScanMeta({
        engine:       result.engine,
        app_source:   result.app_source,
        low_confidence: result.low_confidence,
      });
      setShowModal(true);
      toast.success(`Receipt scanned via ${result.engine === 'gemini' || result.engine === 'gemini+ocr' ? 'Gemini AI' : 'OCR'}!`);
    } catch (err) {
      toast.error(`Scan failed: ${err.message}. Try a clearer screenshot or fill in manually.`, { duration: 5000 });
    } finally {
      setScanning(false);
    }
  }

  async function handleScanFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-selected
    await uploadAndScan(file);
  }

  async function handleNativeScan() {
    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Photos,
        resultType: CameraResultType.Uri,
      });
      if (!photo.webPath) return;
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const file = new File([blob], `receipt.${photo.format}`, { type: `image/${photo.format}` });
      await uploadAndScan(file);
    } catch (err) {
      if (err.message && !err.message.includes('User cancelled')) {
        toast.error(`Camera error: ${err.message}`);
      }
    }
  }

  function handleScanClick() {
    if (Capacitor.isNativePlatform()) {
      handleNativeScan();
    } else {
      scanFileInputRef.current?.click();
    }
  }

  function renderTarget(t) {
    // Multi-item transaction
    if (t.transaction_items?.length > 1) {
      return <span>{t.transaction_items.map(ti => ti.items?.name || itemMap[ti.item_id]?.name).filter(Boolean).join(', ')}</span>;
    }
    if (t.type === 'expense' && t.item_id) return t.items?.name || itemMap[t.item_id]?.name || 'Item';
    if (t.type === 'debt_payment' && t.debt_id) return t.debts?.name || debtMap[t.debt_id]?.name || 'Debt';
    if (t.type === 'goal_contribution' && t.goal_id) return t.goals?.name || goalMap[t.goal_id]?.name || 'Goal';
    if (t.type === 'expense' && t.subscription_id) return <span className="text-primary font-medium">{t.subscriptions?.name || 'Subscription'}</span>;
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Hidden file input for receipt scanning */}
          <input
            ref={scanFileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleScanFile}
            id="receipt-scan-input"
          />
          <motion.button
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleScanClick}
            disabled={scanning}
            whileHover={{ scale: 1.04 }} whileTap={tapFeedback}
            title="Scan a UPI receipt screenshot"
          >
            {scanning
              ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              : <ScanLine size={15} />}
            {scanning ? 'Scanning…' : 'Scan Receipt'}
          </motion.button>
          <motion.button className="btn btn-primary" onClick={() => { setScanData(null); setScanMeta(null); setShowModal(true); }} whileHover={{ scale: 1.04 }} whileTap={tapFeedback} onTapStart={impactLight}>
            <Plus size={16} /> Log Transaction
          </motion.button>
        </div>
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
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {!['transfer_in', 'transfer_out'].includes(t.type) && (
                        <button
                          className="btn btn-icon btn-ghost btn-sm text-muted"
                          title="Edit"
                          onClick={() => setEditingTransaction(t)}
                          style={{ color: 'var(--color-text-3)' }}
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      <button className="btn btn-icon btn-ghost btn-sm text-muted hover:text-danger" onClick={() => handleDelete(t.id)}>
                        ×
                      </button>
                    </div>
                  </td>
                </>
              )}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {(showModal || editingTransaction) && (
          <AddTransactionModal
            items={items}
            accounts={accounts}
            debts={debts}
            goals={goals}
            wordFreq={wordFreq}
            onClose={() => { setShowModal(false); setEditingTransaction(null); setScanData(null); setScanMeta(null); }}
            onCreate={create.mutateAsync}
            onUpdate={update.mutateAsync}
            onTransfer={transfer.mutateAsync}
            initialData={editingTransaction ?? scanData}
            editMode={!!editingTransaction}
            scanMeta={editingTransaction ? null : scanMeta}
          />
        )}
      </AnimatePresence>
    </div>
    </PullToRefresh>
  );
}
