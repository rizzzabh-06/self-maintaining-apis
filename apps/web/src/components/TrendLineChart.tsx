import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendLineChartProps {
  data: Array<{ date: string; count: number }>;
  title: string;
  height?: number;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ data, title, height = 280 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-light)', fontSize: '0.875rem' }}>No data available</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--ink)' }}>
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--ink-light)"
            style={{ fontSize: '0.75rem' }}
          />
          <YAxis
            stroke="var(--ink-light)"
            style={{ fontSize: '0.75rem' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--ink)',
              boxShadow: 'var(--shadow-md)',
            }}
            labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--blue)"
            strokeWidth={2}
            dot={{ fill: 'var(--blue)', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

