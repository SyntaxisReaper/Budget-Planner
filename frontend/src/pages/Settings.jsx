import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient.js';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings').then(res => res.data),
  });

  const [form, setForm] = useState({
    current_balance: 0,
    cycle_income: 0,
    cycle_start_date: new Date().toISOString().split('T')[0],
    cycle_days: 30,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        current_balance: settings.current_balance || 0,
        cycle_income: settings.cycle_income || 0,
        cycle_start_date: settings.cycle_start_date || new Date().toISOString().split('T')[0],
        cycle_days: settings.cycle_days || 30,
      });
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (data) => apiClient.put('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings updated successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings.mutate({
      ...form,
      current_balance: parseFloat(form.current_balance),
      cycle_income: parseFloat(form.cycle_income),
      cycle_days: parseInt(form.cycle_days, 10),
    });
  };

  if (isLoading) return <div className="page-loading"><span className="spinner" /> Loading settings...</div>;

  return (
    <div className="page-container" style={{ maxWidth: '600px' }}>
      <header className="page-header">
        <h1 className="page-title"><SettingsIcon /> My Cycle & Balance</h1>
        <p className="text-muted">Configure your budget cycle outside of strict calendar months.</p>
      </header>

      <div className="card">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="form-group">
            <label className="label">Current Balance (₹)</label>
            <input 
              type="number" 
              className="input" 
              step="0.01" 
              value={form.current_balance}
              onChange={e => setForm(p => ({ ...p, current_balance: e.target.value }))}
              placeholder="How much cash do you have right now?"
            />
            <span className="text-xs text-muted">This helps calculate your runway and actual budget constraints.</span>
          </div>

          <div className="form-group">
            <label className="label">Income per Cycle (₹)</label>
            <input 
              type="number" 
              className="input" 
              step="0.01" 
              value={form.cycle_income}
              onChange={e => setForm(p => ({ ...p, cycle_income: e.target.value }))}
              placeholder="0.00"
            />
            <span className="text-xs text-muted">This overrides your individual income sources for cycle-based planning.</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Cycle Start Date (Optional)</label>
              <input 
                type="date" 
                className="input"
                value={form.cycle_start_date}
                onChange={e => setForm(p => ({ ...p, cycle_start_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="label">Cycle Length (Days)</label>
              <input 
                type="number" 
                className="input"
                min="1"
                value={form.cycle_days}
                onChange={e => setForm(p => ({ ...p, cycle_days: e.target.value }))}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary mt-4" 
            style={{ alignSelf: 'flex-start' }}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? <span className="spinner" /> : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
