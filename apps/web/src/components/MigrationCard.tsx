import { Clock, ExternalLink, FileText } from 'lucide-react';
import { ConfidenceGauge } from './ConfidenceGauge';

interface Migration {
  id: string;
  provider: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: string;
  confidence: number;
  repoName: string;
}

interface MigrationCardProps {
  migration: Migration;
  onClick?: () => void;
}

export const MigrationCard: React.FC<MigrationCardProps> = ({ migration, onClick }) => {
  const formatRelativeTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins < 1 ? 'Just now' : `${diffMins}m ago`;
      }
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return timestamp;
    }
  };

  const getStatusBadge = (status: Migration['status']) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'running':
        return <span className="badge badge-info">Running</span>;
      case 'failed':
        return <span className="badge badge-critical">Failed</span>;
      default:
        return <span className="badge badge-amber">Pending</span>;
    }
  };

  return (
    <div
      className="glass-panel glass-panel-interactive"
      style={{
        padding: '1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {migration.repoName}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {migration.provider} migration
          </p>
        </div>
        {getStatusBadge(migration.status)}
      </div>

      {/* Confidence and Time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ConfidenceGauge value={migration.confidence} size={80} label="Confidence" />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Clock size={14} />
          <span style={{ fontSize: '0.75rem' }}>{formatRelativeTime(migration.timestamp)}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <button
          className="btn-secondary"
          style={{ flex: 1, fontSize: '0.75rem', padding: '0.5rem' }}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <FileText size={14} />
          Details
        </button>
        <button
          className="btn-ghost"
          style={{ flex: 1, fontSize: '0.75rem', padding: '0.5rem' }}
          onClick={(e) => {
            e.stopPropagation();
            // Navigate to PR (placeholder)
          }}
        >
          <ExternalLink size={14} />
          View PR
        </button>
      </div>
    </div>
  );
};
