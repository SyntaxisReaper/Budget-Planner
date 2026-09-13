import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="recharts-default-tooltip" style={{ padding: '10px 14px' }}>
      <p className="recharts-tooltip-label">{label}</p>
      <p style={{ color: 'var(--color-text)', fontWeight: 600 }}>Balance: {fmt.format(payload[0].value)}</p>
      {payload[0].payload.monthly_payment > 0 && (
        <p style={{ color: 'var(--color-text-2)', fontSize: 12 }}>
          {payload[0].payload.months_to_payoff
            ? `${payload[0].payload.months_to_payoff} months to payoff`
            : 'Ongoing'}
        </p>
      )}
    </div>
  );
};

/**
 * DebtPayoffChart — horizontal bar chart of remaining balances
 * Props: { debts: [{ id, name, remaining_balance, months_to_payoff, monthly_payment }] }
 */
export default function DebtPayoffChart({ debts = [] }) {
  if (!debts.length) {
    return (
      <div className="empty-state">
        <p>No active debts to display.</p>
      </div>
    );
  }

  const data = debts.map((d) => ({
    name: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name,
    value: Number(d.remaining_balance),
    months_to_payoff: d.months_to_payoff,
    monthly_payment: d.monthly_payment,
  }));

  const colors = [
    'hsl(245, 70%, 65%)',
    'hsl(170, 65%, 48%)',
    'hsl(38, 85%, 58%)',
    'hsl(355, 70%, 60%)',
    'hsl(200, 75%, 55%)',
  ];

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, debts.length * 60)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" tickFormatter={(v) => fmt.format(v)} tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: 'var(--color-text-2)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
