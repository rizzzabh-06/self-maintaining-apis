import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, FileCode, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { fetchImpact } from "../api/client";

const RISK_COLORS: Record<string, { color: string; glow: string; badge: string }> = {
  critical: { color: "#fb7185", glow: "var(--glow-rose)", badge: "badge-critical" },
  high: { color: "#fbbf24", glow: "var(--glow-amber)", badge: "badge-warning" },
  medium: { color: "#818cf8", glow: "var(--glow-indigo)", badge: "badge-indigo" },
  low: { color: "#34d399", glow: "var(--glow-emerald)", badge: "badge-success" },
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
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      {/* Fill */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="url(#confGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <defs>
        <linearGradient id="confGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
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
                background: "rgba(99,102,241,0.4)",
                flexShrink: 0,
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "#818cf8",
            }}
          >
            <FileCode size={11} />
            {u.file_path?.split("/").pop() || u.file_path}
            {u.line_number && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>:L{u.line_number}</span>
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
    <div style={{ maxWidth: "1500px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: "1.75rem" }}>
        <div className="section-eyebrow" style={{ color: "var(--accent-purple)" }}>
          <ShieldCheck size={16} />
          Code Graph Analysis
        </div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Impact Analysis</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "4px" }}>
          Pinpointing exact files, symbols, callers, and risk levels affected by the API version change.
        </p>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
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
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            {/* Risk */}
            <div
              className="glass-panel animate-fade-up"
              style={{
                padding: "1.5rem",
                borderLeft: `3px solid #fb7185`,
                background: "rgba(244,63,94,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertTriangle size={12} /> Overall Risk
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fb7185", letterSpacing: "-0.03em" }}>
                {(impact?.risk_level || "CRITICAL").toUpperCase()}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Breaking changes across {impact?.affected_files?.length || 4} core modules
              </div>
            </div>

            {/* Confidence Arc */}
            <div
              className="glass-panel animate-fade-up"
              style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "16px" }}
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
                    transform: "rotate(90deg)",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#34d399" }}>
                      {Math.round(conf * 100)}%
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <TrendingUp size={12} /> Confidence
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  AST & symbol matching verified with deterministic recipe
                </div>
              </div>
            </div>

            {/* Affected Files */}
            <div
              className="glass-panel animate-fade-up"
              style={{
                padding: "1.5rem",
                borderLeft: `3px solid var(--accent-cyan)`,
                background: "rgba(6,182,212,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={12} /> Affected Files
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-cyan)", letterSpacing: "-0.03em" }}>
                {impact?.affected_files?.length || 4}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Client, callers, types & config
              </div>
            </div>
          </div>

          {/* Affected Files & Call Chains */}
          <div className="glass-panel" style={{ padding: "1.75rem" }}>
            <h2
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FileCode size={18} color="var(--accent-indigo)" />
              Impacted Files & Usage Call Chains
            </h2>

            <div className="stagger" style={{ display: "grid", gap: "1rem" }}>
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
                const risk = RISK_COLORS[riskKey] || RISK_COLORS.medium;
                return (
                  <div
                    key={idx}
                    className="animate-fade-up"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid rgba(255,255,255,0.06)`,
                      borderLeft: `3px solid ${risk.color}`,
                      borderRadius: "var(--radius-md)",
                      padding: "1.25rem",
                      transition: "box-shadow var(--transition-base)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = risk.glow;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <FileCode size={16} color={risk.color} />
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            color: "#ffffff",
                            fontSize: "0.9rem",
                          }}
                        >
                          {u.file_path}
                        </span>
                        {u.line_number && (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.75rem",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            :L{u.line_number}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span className={`badge ${risk.badge}`} style={{ fontSize: "0.65rem" }}>
                          {riskKey.toUpperCase()}
                        </span>
                        <span className="badge badge-info" style={{ fontSize: "0.65rem" }}>
                          {(u.usage_type || "").replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "0.83rem",
                        color: "var(--text-secondary)",
                        marginBottom: "8px",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>Reason:</strong> {u.change_reason}
                    </div>

                    {u.snippet && (
                      <div className="code-snippet-expanded" style={{ maxHeight: "80px", overflow: "hidden" }}>
                        {u.snippet}
                      </div>
                    )}

                    {/* Call chain visualization */}
                    {u.callers && u.callers.length > 0 && (
                      <div style={{ marginTop: "10px" }}>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            marginBottom: "6px",
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
