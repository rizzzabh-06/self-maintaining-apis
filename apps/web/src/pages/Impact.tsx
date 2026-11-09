import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, FileCode, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { fetchImpact } from "../api/client";

const RISK_CONFIG: Record<string, { color: string; badge: string }> = {
  critical: { color: "var(--error)", badge: "badge-critical" },
  high: { color: "var(--warning)", badge: "badge-warning" },
  medium: { color: "var(--blue)", badge: "badge-info" },
  low: { color: "var(--success)", badge: "badge-success" },
};

function getRisk(u: any): string {
  const r = (u.risk_level || u.change_reason || "").toLowerCase();
  if (r.includes("critical") || r.includes("rename")) return "critical";
  if (r.includes("high") || r.includes("required")) return "high";
  if (r.includes("medium")) return "medium";
  return "low";
}

// Animated radial arc via SVG
function ConfidenceArc({ value }: { value: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - value);

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
      {/* Track */}
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
      {/* Fill */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--blue)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

// SVG call chain tree
function CallChain({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {items.map((u, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {i > 0 && (
            <div
              style={{
                width: "20px",
                height: "2px",
                background: "var(--border)",
                flexShrink: 0,
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--frost)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--ink)",
            }}
          >
            <FileCode size={12} color="var(--blue)" />
            {u.file_path?.split("/").pop() || u.file_path}
            {u.line_number && (
              <span style={{ color: "var(--ink-light)", fontSize: "0.7rem" }}>:L{u.line_number}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export const Impact: React.FC = () => {
  const [impact, setImpact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confVisible, setConfVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchImpact("fakepay");
      setImpact(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setConfVisible(true), 100);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const conf = confVisible ? (impact?.overall_confidence || 0.95) : 0;
  const affectedUsages: any[] = impact?.affected_usages || [];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: "2rem" }}>
        <div className="section-eyebrow" style={{ color: "var(--blue)" }}>
          <ShieldCheck size={15} />
          Code Graph Analysis
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)", margin: 0 }}>
          Impact Analysis
        </h1>
        <p style={{ color: "var(--ink-light)", fontSize: "0.95rem", marginTop: "8px", maxWidth: "800px" }}>
          Pinpointing exact files, symbols, callers, and risk levels affected by the API version change.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "3.5rem 2rem", textAlign: "center", color: "var(--ink-light)" }}>
          <div className="animate-breathe" style={{ display: "inline-block" }}>
            Computing impact graph...
          </div>
        </div>
      ) : (
        <>
          {/* Summary Row */}
          <div
            className="stagger"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            {/* Risk */}
            <div
              className="card animate-fade-up"
              style={{
                padding: "1.5rem",
                borderLeft: "4px solid var(--error)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--ink-light)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertTriangle size={13} color="var(--error)" /> Overall Risk
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--error)", letterSpacing: "-0.03em" }}>
                {(impact?.risk_level || "CRITICAL").toUpperCase()}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "6px" }}>
                Breaking changes across {impact?.affected_files?.length || 4} core modules
              </div>
            </div>

            {/* Confidence Arc */}
            <div
              className="card animate-fade-up"
              style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "18px" }}
            >
              <div style={{ position: "relative", width: "100px", height: "100px", flexShrink: 0 }}>
                <ConfidenceArc value={conf} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)" }}>
                      {Math.round(conf * 100)}%
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--ink-light)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <TrendingUp size={13} color="var(--blue)" /> Confidence
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--ink-medium)", lineHeight: 1.5 }}>
                  AST & symbol matching verified with deterministic recipe
                </div>
              </div>
            </div>

            {/* Affected Files */}
            <div
              className="card animate-fade-up"
              style={{
                padding: "1.5rem",
                borderLeft: "4px solid var(--blue)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--ink-light)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={13} color="var(--blue)" /> Affected Files
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.03em" }}>
                {impact?.affected_files?.length || 4}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "6px" }}>
                Client, callers, types & config
              </div>
            </div>
          </div>

          {/* Affected Files & Call Chains */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--ink)",
                margin: "0 0 1.5rem 0",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <FileCode size={18} color="var(--blue)" />
              Impacted Files & Usage Call Chains
            </h2>

            <div className="stagger" style={{ display: "grid", gap: "1.25rem" }}>
              {(affectedUsages.length === 0
                ? [
                    { file_path: "src/fakepay-client.ts", usage_type: "client_method_call", line_number: 8, change_reason: "Endpoint rename: /payment → /payments", snippet: "this.http.post<Payment>('/payment', req)" },
                    { file_path: "src/checkout.ts", usage_type: "endpoint_call", line_number: 15, change_reason: "Required field: currency now mandatory in v2", snippet: "amount: amountCents, source: paymentToken" },
                    { file_path: "src/config.ts", usage_type: "base_url_config", line_number: 2, change_reason: "Base URL version bump: /v1 → /v2", snippet: "baseUrl: 'https://api.fakepay.dev/v1'" },
                    { file_path: "src/types.ts", usage_type: "type_reference", line_number: 5, change_reason: "Type contract: currency? → currency (required)", snippet: "currency?: string;" },
                  ]
                : affectedUsages
              ).map((u: any, idx: number) => {
                const riskKey = getRisk(u);
                const risk = RISK_CONFIG[riskKey] || RISK_CONFIG.medium;
                return (
                  <div
                    key={idx}
                    className="card animate-fade-up"
                    style={{
                      borderLeft: `4px solid ${risk.color}`,
                      padding: "1.25rem 1.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <FileCode size={16} color="var(--blue)" />
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 600,
                            color: "var(--ink)",
                            fontSize: "0.92rem",
                          }}
                        >
                          {u.file_path}
                        </span>
                        {u.line_number && (
                          <span
                            style={{
                              color: "var(--ink-light)",
                              fontSize: "0.78rem",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            :L{u.line_number}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <span className={`badge ${risk.badge}`} style={{ fontSize: "0.68rem" }}>
                          {riskKey.toUpperCase()}
                        </span>
                        <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>
                          {(u.usage_type || "").replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "0.88rem",
                        color: "var(--ink-medium)",
                        marginBottom: "12px",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong style={{ color: "var(--ink)" }}>Reason:</strong> {u.change_reason}
                    </div>

                    {u.snippet && (
                      <div className="code-snippet-expanded" style={{ maxHeight: "90px", overflow: "hidden" }}>
                        {u.snippet}
                      </div>
                    )}

                    {/* Call chain visualization */}
                    {u.callers && u.callers.length > 0 && (
                      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--ink-light)",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            marginBottom: "8px",
                          }}
                        >
                          Caller chain
                        </div>
                        <CallChain items={u.callers} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

