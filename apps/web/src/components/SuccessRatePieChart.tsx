import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SuccessRatePieChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
}

export const SuccessRatePieChart: React.FC<SuccessRatePieChartProps> = ({ data, height = 260 }) => {
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
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(13, 21, 38, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '0.8rem',
            }}
          />
          <Legend
            wrapperStyle={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
