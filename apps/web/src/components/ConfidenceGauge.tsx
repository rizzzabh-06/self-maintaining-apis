interface ConfidenceGaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({ value, size = 120, label }) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100);
  
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--blue)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: `${size / 4}px`,
            fontWeight: 700,
            fill: 'var(--ink)',
            transform: 'rotate(90deg)',
            transformOrigin: 'center',
          }}
        >
          {Math.round(clampedValue)}%
        </text>
      </svg>
      
      {label && (
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--ink-light)',
            textAlign: 'center',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

