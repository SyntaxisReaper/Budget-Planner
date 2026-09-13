import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function HistoryChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--color-muted)', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
            tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
            width={80}
          />
          <Tooltip 
            cursor={{ fill: 'var(--bg-card-hover)', opacity: 0.4 }}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
            formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
          />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 14 }} />
          <Bar dataKey="income" name="Income" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="expense" name="Expense" fill="var(--color-danger)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
