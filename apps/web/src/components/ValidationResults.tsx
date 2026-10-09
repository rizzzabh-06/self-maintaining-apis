import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

interface ValidationData {
  build_logs?: {
    success: boolean;
    output: string;
  };
  test_results?: {
    passed: number;
    failed: number;
    details: string;
  };
  contract_checks?: {
    violations: Array<{
      type: string;
      message: string;
      diff?: string;
    }>;
  };
}

interface ValidationResultsProps {
  validationData: ValidationData | null | undefined;
}

interface SectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  success: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<SectionProps> = ({ title, isOpen, onToggle, success, children }) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
        className="glass-panel-interactive"
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        {success ? (
          <CheckCircle2 size={16} color="var(--accent-emerald)" />
        ) : (
          <XCircle size={16} color="var(--accent-rose)" />
        )}
      </button>
      
      {isOpen && (
        <div
          className="animate-fade-up"
          style={{
            marginTop: '0.5rem',
            padding: '1rem',
            background: 'rgba(4, 8, 16, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const ValidationResults: React.FC<ValidationResultsProps> = ({ validationData }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    build: false,
    tests: false,
    contracts: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!validationData) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No validation data available
        </p>
      </div>
    );
  }

  const renderDiffLine = (line: string, index: number) => {
    if (line.startsWith('+')) {
      return (
        <div key={index} className="diff-line-add">
          {line}
        </div>
      );
    }
    if (line.startsWith('-')) {
      return (
        <div key={index} className="diff-line-del">
          {line}
        </div>
      );
    }
    if (line.startsWith('@@')) {
      return (
        <div key={index} className="diff-line-hunk">
          {line}
        </div>
      );
    }
    return (
      <div key={index} className="diff-line-ctx">
        {line}
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
        Validation Results
      </h3>

      {validationData.build_logs && (
        <CollapsibleSection
          title="Build Logs"
          isOpen={openSections.build}
          onToggle={() => toggleSection('build')}
          success={validationData.build_logs.success}
        >
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: validationData.build_logs.success ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {validationData.build_logs.output}
          </pre>
        </CollapsibleSection>
      )}

      {validationData.test_results && (
        <CollapsibleSection
          title={`Test Results (${validationData.test_results.passed} passed, ${validationData.test_results.failed} failed)`}
          isOpen={openSections.tests}
          onToggle={() => toggleSection('tests')}
          success={validationData.test_results.failed === 0}
        >
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                {validationData.test_results.passed}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Passed</div>
            </div>
            <div
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'rgba(244, 63, 94, 0.1)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                {validationData.test_results.failed}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Failed</div>
            </div>
          </div>
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {validationData.test_results.details}
          </pre>
        </CollapsibleSection>
      )}

      {validationData.contract_checks && (
        <CollapsibleSection
          title={`Contract Checks (${validationData.contract_checks.violations.length} violations)`}
          isOpen={openSections.contracts}
          onToggle={() => toggleSection('contracts')}
          success={validationData.contract_checks.violations.length === 0}
        >
          {validationData.contract_checks.violations.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
              No contract violations found
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {validationData.contract_checks.violations.map((violation, index) => (
                <div key={index}>
                  <div
                    className="badge badge-critical"
                    style={{ marginBottom: '0.5rem', fontSize: '0.65rem' }}
                  >
                    {violation.type}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {violation.message}
                  </p>
                  {violation.diff && (
                    <div className="diff-container">
                      {violation.diff.split('\n').map((line, i) => renderDiffLine(line, i))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
};
