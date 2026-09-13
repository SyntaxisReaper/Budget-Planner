import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient.js';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Wallet, Calendar, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, itemVariants, fadeUp } from '../lib/motion.js';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings'),
  });

  const [form, setForm] = useState({
    current_balance: '',
    cycle_income: '',
    cycle_start_date: '',
    cycle_days: 30,
  });

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
        <h1 className="page-title">Cycle &amp; Balance</h1>
        <p className="page-subtitle">Configure your income cycle and current financial position.</p>
      </motion.div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

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
            <input
              type="number"
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
            <input
              type="number"
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
              <input
                type="number"
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
              <SettingsIcon size={15} /> Save Settings
            </>}
          </motion.button>
        </motion.div>
      </form>
    </div>
  );
}
