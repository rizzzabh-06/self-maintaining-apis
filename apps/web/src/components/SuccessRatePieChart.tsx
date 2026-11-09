import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SuccessRatePieChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
}

export const SuccessRatePieChart: React.FC<SuccessRatePieChartProps> = ({ data, height = 260 }) => {
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
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#29B5E8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--ink)',
              boxShadow: 'var(--shadow-md)',
            }}
          />
          <Legend
            wrapperStyle={{
              fontSize: '0.78rem',
              color: 'var(--ink-light)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

