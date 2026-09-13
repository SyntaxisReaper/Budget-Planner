import { Sankey, Tooltip, ResponsiveContainer, Layer } from 'recharts';

function SankeyNode({ x, y, width, height, index, payload, containerWidth }) {
  const isOut = x + width + 6 > containerWidth;
  return (
    <Layer key={`CustomNode${index}`}>
      <rect x={x} y={y} width={width} height={height} fill="var(--color-primary)" fillOpacity={0.85} rx={2} />
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="12"
        fill="var(--color-text)"
        dy={4}
        fontWeight={500}
      >
        {payload.name}
      </text>
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 14}
        fontSize="10"
        fill="var(--color-muted)"
      >
        ₹{payload.value.toLocaleString('en-IN')}
      </text>
    </Layer>
  );
}

export default function CashFlowSankey({ data }) {
  if (!data || !data.nodes || data.nodes.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          node={<SankeyNode />}
          nodePadding={40}
          margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
          link={{ stroke: 'var(--color-text)', strokeOpacity: 0.15 }}
        >
          <Tooltip 
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', color: 'var(--color-text)' }}
            formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
