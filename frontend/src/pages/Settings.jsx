import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient.js';
import toast from '../lib/haptics.js';
import { Settings as SettingsIcon, Wallet, Calendar, RefreshCw, Download, Upload, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, itemVariants, fadeUp } from '../lib/motion.js';
import { Capacitor } from '@capacitor/core';
import Papa from 'papaparse';
import { useAccounts } from '../hooks/useBudget.js';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings'),
  });
  
  const { query: accountsQuery } = useAccounts();
  const accounts = accountsQuery.data || [];

  const [form, setForm] = useState({
    current_balance: '',
    cycle_income: '',
    cycle_start_date: '',
    cycle_days: 30,
  });

  const [biometricEnabled, setBiometricEnabled] = useState(localStorage.getItem('biometricEnabled') === 'true');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setForm({
        current_balance: settings.current_balance ?? '',
        cycle_income: settings.cycle_income ?? '',
        cycle_start_date: settings.cycle_start_date ?? '',
        cycle_days: settings.cycle_days ?? 30,
      });
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (data) => apiClient.put('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message);
    }
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings.mutate({
      current_balance: form.current_balance !== '' ? parseFloat(form.current_balance) : null,
      cycle_income: form.cycle_income !== '' ? parseFloat(form.cycle_income) : null,
      cycle_start_date: form.cycle_start_date || null,
      cycle_days: parseInt(form.cycle_days, 10) || 30,
    });
  };

  const toggleBiometric = () => {
    const newVal = !biometricEnabled;
    setBiometricEnabled(newVal);
    localStorage.setItem('biometricEnabled', newVal.toString());
    toast.success(newVal ? 'Biometrics enabled' : 'Biometrics disabled');
  };

  const handleExportCSV = async () => {
    try {
      const res = await apiClient.get('/transactions');
      const data = res.data.map(tx => ({
        Date: tx.occurred_at,
        Type: tx.type,
        Amount: tx.amount,
        Account: tx.accounts?.name || 'Unknown',
        Item: tx.items?.name || '',
        Debt: tx.debts?.name || '',
        Goal: tx.goals?.name || '',
        Note: tx.note || ''
      }));
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported to CSV');
    } catch(err) {
      toast.error('Failed to export transactions');
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (accounts.length === 0) {
      toast.error('You must have at least one account to import transactions.');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const validTransactions = [];
        
        // Default account
        const defaultAccount = accounts.find(a => a.is_default) || accounts[0];

        for (const row of rows) {
          const date = row.Date || row.date;
          const type = row.Type || row.type || 'expense';
          const amount = parseFloat(row.Amount || row.amount || 0);
          
          if (!date || isNaN(amount)) continue;
          
          validTransactions.push({
            occurred_at: date,
            type: type.toLowerCase(),
            amount: amount,
            account_id: defaultAccount.id,
            note: row.Note || row.note || 'CSV Import'
          });
        }

        if (validTransactions.length === 0) {
          toast.error('No valid transactions found in CSV.');
          return;
        }

        try {
          await apiClient.post('/transactions/bulk', validTransactions);
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          toast.success(`Imported ${validTransactions.length} transactions`);
        } catch(err) {
          toast.error('Bulk import failed.');
        }
      }
    });
    // Reset file input
    e.target.value = null;
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="empty-state"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <motion.div className="page-header" variants={fadeUp} initial="hidden" animate="visible">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure cycle, security, and data.</p>
      </motion.div>

      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        
        {/* Core Settings Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          <div className="section-title">Cycle & Balance</div>

          {/* Balance */}
          <motion.div className="card flex flex-col gap-4" variants={itemVariants} whileHover={{ y: -2, transition: { duration: 0.18 } }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="stat-icon" style={{ background: 'rgba(52,211,153,0.1)' }}>
                <Wallet size={18} color="var(--color-success)" />
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: 'var(--text-base)' }}>Current Balance</div>
                <div className="text-xs text-muted">How much money you have right now</div>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Balance (₹)</label>
              <input type="number" inputMode="decimal"
                className="input"
                step="0.01"
                min="0"
                placeholder="e.g. 12500.00"
                value={form.current_balance}
                onChange={e => set('current_balance', e.target.value)}
              />
            </div>
          </motion.div>

          {/* Income */}
          <motion.div className="card flex flex-col gap-4" variants={itemVariants} whileHover={{ y: -2, transition: { duration: 0.18 } }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="stat-icon" style={{ background: 'rgba(99,179,237,0.1)' }}>
                <RefreshCw size={18} color="hsl(205, 75%, 65%)" />
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: 'var(--text-base)' }}>Income per Cycle</div>
                <div className="text-xs text-muted">Overrides individual income sources for cycle-based planning</div>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Income (₹)</label>
              <input type="number" inputMode="decimal"
                className="input"
                step="0.01"
                min="0"
                placeholder="e.g. 30000.00"
                value={form.cycle_income}
                onChange={e => set('cycle_income', e.target.value)}
              />
            </div>
          </motion.div>

          {/* Cycle */}
          <motion.div className="card flex flex-col gap-4" variants={itemVariants} whileHover={{ y: -2, transition: { duration: 0.18 } }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Calendar size={18} color="var(--color-warning)" />
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: 'var(--text-base)' }}>Budget Cycle</div>
                <div className="text-xs text-muted">Set your own cycle dates — no strict calendar months needed</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Start Date <span className="text-muted">(Optional)</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.cycle_start_date}
                  onChange={e => set('cycle_start_date', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Cycle Length (Days)</label>
                <input type="number" inputMode="decimal"
                  className="input"
                  min="1"
                  max="365"
                  value={form.cycle_days}
                  onChange={e => set('cycle_days', e.target.value)}
                />
              </div>
            </div>
          </motion.div>
          </motion.div>

          <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
            <motion.button
              type="submit"
              className="btn btn-primary"
              disabled={updateSettings.isPending}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              {updateSettings.isPending ? <span className="spinner" /> : <>
                <SettingsIcon size={15} /> Save Cycle Settings
              </>}
            </motion.button>
          </motion.div>
        </form>

        {/* Security Section (Native Only) */}
        {Capacitor.isNativePlatform() && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mt-4">
            <div className="section-title mb-4">Security</div>
            <div className="card flex items-center justify-between" style={{ padding: 'var(--space-4)' }}>
              <div className="flex items-center gap-4">
                <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)', marginBottom: 0 }}>
                  <Shield size={18} color="#8b5cf6" />
                </div>
                <div>
                  <div className="font-semibold">App Lock</div>
                  <div className="text-xs text-muted">Require FaceID / Fingerprint to open</div>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={biometricEnabled} onChange={toggleBiometric} style={{ transform: 'scale(1.2)' }} />
              </label>
            </div>
          </motion.div>
        )}

        {/* Data Management Section */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mt-4">
          <div className="section-title mb-4">Data Management</div>
          <div className="card flex flex-col gap-4">
            <div className="flex flex-wrap gap-4">
              <button type="button" className="btn btn-accent flex-1" onClick={handleExportCSV}>
                <Download size={15} /> Export CSV
              </button>
              <button type="button" className="btn btn-accent flex-1" onClick={() => fileInputRef.current?.click()}>
                <Upload size={15} /> Import CSV
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" style={{ display: 'none' }} />
            </div>
            <div className="text-xs text-muted text-center">
              Import CSV expects columns: Date, Type (expense/income), Amount, Note
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
