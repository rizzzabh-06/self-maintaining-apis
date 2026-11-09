import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RepositoryBarChartProps {
  data: Array<{ repo: string; count: number }>;
  height?: number;
}

export const RepositoryBarChart: React.FC<RepositoryBarChartProps> = ({ data, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-light)', fontSize: '0.875rem' }}>No data available</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="repo"
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
          <Bar
            dataKey="count"
            fill="var(--blue)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

