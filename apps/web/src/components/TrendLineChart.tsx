import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendLineChartProps {
  data: Array<{ date: string; count: number }>;
  title: string;
  height?: number;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ data, title, height = 280 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data available</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            stroke="var(--text-muted)"
            style={{ fontSize: '0.75rem' }}
          />
          <YAxis
            stroke="var(--text-muted)"
            style={{ fontSize: '0.75rem' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(13, 21, 38, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '0.8rem',
            }}
            labelStyle={{ color: 'var(--text-primary)' }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--accent-cyan)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent-cyan)', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
