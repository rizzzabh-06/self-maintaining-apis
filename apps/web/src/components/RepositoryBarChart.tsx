import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RepositoryBarChartProps {
  data: Array<{ repo: string; count: number }>;
  height?: number;
}

export const RepositoryBarChart: React.FC<RepositoryBarChartProps> = ({ data, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data available</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="repo"
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
          <Bar
            dataKey="count"
            fill="var(--accent-indigo)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
