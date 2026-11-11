import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  GitPullRequest,
  Terminal,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { fetchValidationList } from "../api/client";

interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip";
  duration_ms: number;
  error?: string;
}

interface ValidationRun {
  id: string;
  repo: string;
  provider: string;
  status: "passed" | "failed" | "running" | "pending";
  created_at: string;
  duration_s: number;
  pr_url?: string;
  build_log: string[];
  tests: TestResult[];
  diff_summary: { added: number; removed: number; changed: number };
}

// --- Mock data while backend endpoint is scaffolded ---
const MOCK_VALIDATIONS: ValidationRun[] = [
  {
    id: "val-001",
    repo: "rizzzabh-06/BIT-TRACE",
    provider: "FakePay v2.0.0",
    status: "passed",
    created_at: "2026-11-09T18:12:00Z",
    duration_s: 47,
    pr_url: "https://github.com/rizzzabh-06/BIT-TRACE/pull/12",
    build_log: [
      "[00:00] Installing dependencies...",
      "[00:08] npm ci -- completed (312 packages)",
      "[00:09] Running tsc --noEmit...",
      "[00:14] TypeScript: 0 errors",
      "[00:15] Running jest --ci...",
      "[00:41] Tests: 24 passed, 0 failed",
      "[00:47] ✓ Sandbox validation PASSED",
    ],
    tests: [
      { name: "FakePay.createPayment - new required field", status: "pass", duration_ms: 112 },
      { name: "FakePay.refund - endpoint renamed", status: "pass", duration_ms: 88 },
      { name: "FakePay.webhookSignature - type widened", status: "pass", duration_ms: 94 },
      { name: "Integration: checkout flow end-to-end", status: "pass", duration_ms: 2340 },
    ],
    diff_summary: { added: 23, removed: 11, changed: 7 },
  },
  {
    id: "val-002",
    repo: "demo-checkout",
    provider: "Stripe v3.1.0",
    status: "failed",
    created_at: "2026-11-09T16:05:00Z",
    duration_s: 31,
    build_log: [
      "[00:00] Installing dependencies...",
      "[00:07] npm ci -- completed",
      "[00:08] Running tsc --noEmit...",
      "[00:13] error TS2345: Argument of type 'string' is not assignable",
      "[00:13] ✗ Build FAILED — stopping sandbox",
    ],
    tests: [
      { name: "Stripe.createPaymentIntent - amount type", status: "fail", duration_ms: 0, error: "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'" },
    ],
    diff_summary: { added: 8, removed: 3, changed: 2 },
  },
  {
    id: "val-003",
    repo: "fakepay-nextjs-demo",
    provider: "FakePay v2.0.0",
    status: "running",
    created_at: "2026-11-09T23:51:00Z",
    duration_s: 0,
    build_log: [
      "[00:00] Installing dependencies...",
      "[00:09] npm ci -- completed",
      "[00:10] Running tsc --noEmit...",
    ],
    tests: [],
    diff_summary: { added: 0, removed: 0, changed: 0 },
  },
];

function statusChip(status: ValidationRun["status"]) {
  const map = {
    passed: { color: "var(--success)", bg: "var(--success-wash)", label: "PASSED", Icon: CheckCircle2 },
    failed: { color: "var(--error)", bg: "rgba(239,68,68,0.08)", label: "FAILED", Icon: XCircle },
    running: { color: "var(--blue)", bg: "var(--blue-wash)", label: "RUNNING", Icon: Loader2 },
    pending: { color: "var(--ink-light)", bg: "var(--gray-50)", label: "PENDING", Icon: Clock },
  };
  const s = map[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px",
        borderRadius: "var(--radius-full)",
        fontSize: "0.6875rem",
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        letterSpacing: "0.04em",
      }}
    >
      <s.Icon size={11} style={status === "running" ? { animation: "spin 1s linear infinite" } : undefined} />
      {s.label}
    </span>
  );
}

function testStatusIcon(status: TestResult["status"]) {
  if (status === "pass") return <CheckCircle2 size={13} color="var(--success)" />;
  if (status === "fail") return <XCircle size={13} color="var(--error)" />;
  return <AlertTriangle size={13} color="var(--warning)" />;
}

function DiffBadge({ added, removed, changed }: { added: number; removed: number; changed: number }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {added > 0 && (
        <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--success)", background: "var(--success-wash)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>
          +{added} added
        </span>
      )}
      {removed > 0 && (
        <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--error)", background: "rgba(239,68,68,0.08)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>
          -{removed} removed
        </span>
      )}
      {changed > 0 && (
        <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--warning)", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>
          ~{changed} changed
        </span>
      )}
    </div>
  );
}

export const ValidationDetails: React.FC = () => {
  const [validations, setValidations] = useState<ValidationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ValidationRun | null>(null);
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [expandedTests, setExpandedTests] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchValidationList({ limit: 20 }).catch(() => null);
      if (data?.items?.length) {
        setValidations(data.items);
      } else {
        setValidations(MOCK_VALIDATIONS);
      }
    } catch {
      setValidations(MOCK_VALIDATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected && validations.length > 0) {
      setSelected(validations[0]);
    }
  }, [validations, selected]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ maxWidth: "1500px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div className="section-eyebrow" style={{ marginBottom: "0.4rem" }}>Sandbox Validation</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--ink)" }}>
            Validation Runs
          </h1>
          <p style={{ color: "var(--ink-light)", fontSize: "0.875rem", marginTop: "4px" }}>
            Isolated build + test results for each migration candidate
          </p>
        </div>
        <button className="btn-secondary" onClick={load} style={{ gap: "6px" }}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem", color: "var(--ink-light)" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Run list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {validations.map((v) => (
              <div
                key={v.id}
                className="card card-interactive"
                onClick={() => { setSelected(v); setExpandedLogs(false); setExpandedTests(true); }}
                style={{
                  padding: "1rem 1.25rem",
                  borderColor: selected?.id === v.id ? "var(--blue)" : "var(--border)",
                  background: selected?.id === v.id ? "var(--blue-wash)" : "var(--white)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink)" }}>{v.repo}</span>
                  {statusChip(v.status)}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--ink-light)", marginBottom: "6px" }}>{v.provider}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.6875rem", color: "var(--ink-light)" }}>
                    <Clock size={10} style={{ display: "inline", marginRight: "4px" }} />
                    {fmtDate(v.created_at)}
                  </span>
                  {v.duration_s > 0 && (
                    <span style={{ fontSize: "0.6875rem", color: "var(--ink-light)" }}>{v.duration_s}s</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Meta card */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)", marginBottom: "4px" }}>
                      {selected.repo}
                    </h2>
                    <div style={{ fontSize: "0.875rem", color: "var(--ink-light)" }}>{selected.provider}</div>
                  </div>
                  {statusChip(selected.status)}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--ink-light)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Started</div>
                    <div style={{ fontSize: "0.875rem", color: "var(--ink-medium)", fontWeight: 600 }}>{fmtDate(selected.created_at)}</div>
                  </div>
                  {selected.duration_s > 0 && (
                    <div>
                      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--ink-light)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Duration</div>
                      <div style={{ fontSize: "0.875rem", color: "var(--ink-medium)", fontWeight: 600 }}>{selected.duration_s}s</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--ink-light)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Diff</div>
                    <DiffBadge {...selected.diff_summary} />
                  </div>
                </div>

                {selected.pr_url && (
                  <a
                    href={selected.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ display: "inline-flex", textDecoration: "none", fontSize: "0.8125rem" }}
                  >
                    <GitPullRequest size={14} />
                    View Draft PR
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* Test results */}
              <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
                <button
                  onClick={() => setExpandedTests(!expandedTests)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", justifyContent: "space-between" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>
                    <CheckCircle2 size={15} color="var(--blue)" />
                    Test Results
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-light)" }}>
                      ({selected.tests.filter(t => t.status === "pass").length}/{selected.tests.length} passed)
                    </span>
                  </span>
                  {expandedTests ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {expandedTests && (
                  <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {selected.tests.length === 0 ? (
                      <p style={{ color: "var(--ink-light)", fontSize: "0.8125rem" }}>No test results yet.</p>
                    ) : (
                      selected.tests.map((t, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            padding: "10px 12px",
                            borderRadius: "var(--radius-md)",
                            background: t.status === "fail" ? "rgba(239,68,68,0.04)" : "var(--gray-50)",
                            border: `1px solid ${t.status === "fail" ? "rgba(239,68,68,0.15)" : "var(--border)"}`,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                              {testStatusIcon(t.status)}
                              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink-medium)" }}>{t.name}</span>
                            </div>
                            {t.duration_ms > 0 && (
                              <span style={{ fontSize: "0.6875rem", color: "var(--ink-light)" }}>{t.duration_ms}ms</span>
                            )}
                          </div>
                          {t.error && (
                            <pre style={{ fontSize: "0.73rem", color: "var(--error)", background: "rgba(239,68,68,0.06)", padding: "6px 10px", borderRadius: "6px", margin: "4px 0 0 20px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                              {t.error}
                            </pre>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Build log */}
              <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
                <button
                  onClick={() => setExpandedLogs(!expandedLogs)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", justifyContent: "space-between" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>
                    <Terminal size={15} color="var(--blue)" />
                    Build Log
                  </span>
                  {expandedLogs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {expandedLogs && (
                  <pre
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      background: "var(--ink)",
                      color: "#e2e8f0",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.73rem",
                      lineHeight: 1.7,
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {selected.build_log.join("\n")}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationDetails;

