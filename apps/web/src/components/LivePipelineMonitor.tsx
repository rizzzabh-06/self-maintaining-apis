import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Clock, AlertCircle } from 'lucide-react';
import { fetchValidation } from '../api/client';

interface LivePipelineMonitorProps {
  migrationId: string;
  onComplete?: () => void;
}

interface PipelineStep {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  timestamp?: string;
}

export const LivePipelineMonitor: React.FC<LivePipelineMonitorProps> = ({ migrationId, onComplete }) => {
  const [steps, setSteps] = useState<PipelineStep[]>([
    { name: 'Patch Generation', status: 'pending' },
    { name: 'Build Validation', status: 'pending' },
    { name: 'Test Execution', status: 'pending' },
    { name: 'Contract Verification', status: 'pending' },
  ]);
  const [retryCount, setRetryCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await fetchValidation(migrationId);
        
        // Update steps based on validation data
        const newSteps: PipelineStep[] = [
          {
            name: 'Patch Generation',
            status: data.patches ? 'complete' : 'running',
            timestamp: data.patches ? 'Just now' : undefined,
          },
          {
            name: 'Build Validation',
            status: data.build_logs ? 'complete' : data.patches ? 'running' : 'pending',
            timestamp: data.build_logs ? 'Just now' : undefined,
          },
          {
            name: 'Test Execution',
            status: data.test_results ? 'complete' : data.build_logs ? 'running' : 'pending',
            timestamp: data.test_results ? 'Just now' : undefined,
          },
          {
            name: 'Contract Verification',
            status: data.contract_checks ? 'complete' : data.test_results ? 'running' : 'pending',
            timestamp: data.contract_checks ? 'Just now' : undefined,
          },
        ];

        setSteps(newSteps);

        // Check if complete
        const allComplete = newSteps.every(s => s.status === 'complete');
        if (allComplete && !isComplete) {
          setIsComplete(true);
          onComplete?.();
        }

        if (data.retry_count !== undefined) {
          setRetryCount(data.retry_count);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    poll(); // Initial poll
    const interval = setInterval(poll, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [migrationId, onComplete, isComplete]);

  const getStatusIcon = (status: PipelineStep['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 size={16} color="var(--accent-emerald)" />;
      case 'running':
        return <Loader2 size={16} color="var(--accent-cyan)" className="animate-spin" />;
      case 'failed':
        return <AlertCircle size={16} color="var(--accent-rose)" />;
      default:
        return <Clock size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Pipeline Progress
        </h3>
        {!isComplete ? (
          <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
            Running
          </span>
        ) : (
          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
            Complete
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {steps.map((step, index) => (
          <div
            key={index}
            className="pipeline-step"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${
                step.status === 'running'
                  ? 'rgba(6, 182, 212, 0.3)'
                  : step.status === 'complete'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'var(--border-subtle)'
              }`,
            }}
          >
            <div style={{ flexShrink: 0 }}>{getStatusIcon(step.status)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {step.name}
              </div>
              {step.timestamp && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {step.timestamp}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          ETA: ~2 min
        </div>
        {retryCount > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)' }}>
            Retries: {retryCount}
          </div>
        )}
      </div>
    </div>
  );
};
