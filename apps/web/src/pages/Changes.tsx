import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, ArrowRight, ShieldAlert, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { fetchChanges } from "../api/client";

const SEVERITY_CONFIG: Record<string, { bar: string; badge: string }> = {
  critical: { bar: "var(--error)", badge: "badge-critical" },
  high: { bar: "var(--warning)", badge: "badge-warning" },
  medium: { bar: "var(--blue)", badge: "badge-info" },
};

function getSeverity(c: any): string {
  const t = (c.severity || c.type || "critical").toLowerCase();
  if (t.includes("critical")) return "critical";
  if (t.includes("high")) return "high";
  return "medium";
}

export const Changes: React.FC = () => {
  const [changesData, setChangesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchChanges();
      setChangesData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changesList: any[] = Array.isArray(changesData) ? changesData : (changesData?.changes || []);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: "2rem" }}>
        <div className="section-eyebrow" style={{ color: "var(--blue)" }}>
          <AlertTriangle size={15} />
          Change Intelligence
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)", margin: 0 }}>
          Detected Breaking Changes
        </h1>
        <p style={{ color: "var(--ink-light)", fontSize: "0.95rem", marginTop: "8px", maxWidth: "800px" }}>
          Structural AST differences between provider API versions requiring automated codebase transformations.
        </p>
      </div>

      {/* Provider Version Banner */}
      <div
        className="card animate-fade-up"
        style={{
          padding: "1.25rem 1.75rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          borderLeft: "4px solid var(--blue)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              padding: "10px",
              borderRadius: "var(--radius-sm)",
              background: "var(--frost)",
              color: "var(--blue)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)" }}>FakePay API Version Upgrade</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <span className="badge badge-info" style={{ fontSize: "0.72rem" }}>
                v1.0.0
              </span>
              <ArrowRight size={13} color="var(--ink-light)" />
              <span className="badge badge-critical" style={{ fontSize: "0.72rem" }}>
                v2.0.0
              </span>
              <span style={{ fontSize: "0.82rem", color: "var(--ink-light)" }}>
                Triggered via Webhook Event
              </span>
            </div>
          </div>
        </div>
        <span className="badge badge-critical" style={{ padding: "6px 14px", fontSize: "0.82rem", fontWeight: 600 }}>
          <Zap size={13} style={{ marginRight: "4px" }} />
          {loading ? "…" : changesList.length} Breaking Changes
        </span>
      </div>

      {/* Timeline changes list */}
      <div style={{ position: "relative", paddingLeft: "28px" }}>
        {/* Vertical timeline connector */}
        {!loading && changesList.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: "9px",
              top: "20px",
              bottom: "20px",
              width: "2px",
              background: "var(--border)",
              borderRadius: "2px",
            }}
          />
        )}

        <div className="stagger" style={{ display: "grid", gap: "1.25rem" }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card skeleton" style={{ height: "110px" }} />
            ))
          ) : changesList.length === 0 ? (
            <div
              className="card"
              style={{ padding: "3.5rem 2rem", textAlign: "center", color: "var(--ink-light)" }}
            >
              No breaking changes detected.
            </div>
          ) : (
            changesList.map((c: any, idx: number) => {
              const sev = getSeverity(c);
              const { bar, badge } = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.critical;
              const isExpanded = expandedIdx === idx;

              return (
                <div
                  key={idx}
                  className="card card-interactive animate-fade-up"
                  style={{
                    overflow: "hidden",
                    position: "relative",
                    borderLeft: `4px solid ${bar}`,
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                >
                  {/* Timeline dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-35px",
                      top: "28px",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: bar,
                      border: "2px solid var(--white)",
                      boxShadow: "0 0 0 1px var(--border)",
                    }}
                  />

                  <div style={{ padding: "1.25rem 1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                          <span className={`badge ${badge}`} style={{ fontSize: "0.68rem" }}>
                            {sev.toUpperCase()}
                          </span>
                          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>
                            {c.description}
                          </span>
                        </div>
                        {c.operation_id && (
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--ink-light)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            Operation: {c.operation_id}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                        <div style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--ink-light)" }}>
                          Evidence: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>OpenAPI Diff</strong>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={16} color="var(--ink-light)" />
                        ) : (
                          <ChevronDown size={16} color="var(--ink-light)" />
                        )}
                      </div>
                    </div>

                    {/* Inline Before/After — always visible */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "1rem" }}>
                      <div
                        style={{
                          background: "var(--frost)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          padding: "10px 14px",
                        }}
                      >
                        <div style={{ fontSize: "0.68rem", color: "var(--error)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
                          Previous (v1.0.0)
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--ink-medium)" }}>
                          {c.old_path || (c.old_required !== undefined ? "currency: optional" : "—")}
                        </div>
                      </div>
                      <div
                        style={{
                          background: "rgba(41, 181, 232, 0.06)",
                          border: "1px solid rgba(41, 181, 232, 0.25)",
                          borderRadius: "var(--radius-sm)",
                          padding: "10px 14px",
                        }}
                      >
                        <div style={{ fontSize: "0.68rem", color: "var(--blue)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
                          New Contract (v2.0.0)
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--ink)", fontWeight: 600 }}>
                          {c.new_path || (c.new_required !== undefined ? "currency: REQUIRED" : "—")}
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div
                        className="animate-fade-up"
                        style={{
                          marginTop: "1.25rem",
                          paddingTop: "1.25rem",
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ fontSize: "0.88rem", color: "var(--ink-medium)", lineHeight: 1.6 }}>
                          <strong style={{ color: "var(--ink)" }}>Impact:</strong> This breaking change
                          affects all call sites that invoke this endpoint path or use the associated type
                          contract. The Migration Engine will apply a deterministic FakePayV1ToV2 recipe to
                          rewrite all affected usages automatically.
                        </div>
                        {c.affected_files && (
                          <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: "0.78rem", color: "var(--ink-light)" }}>Affected files:</span>
                            {c.affected_files.map((f: string) => (
                              <span
                                key={f}
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "0.76rem",
                                  background: "var(--frost)",
                                  color: "var(--ink)",
                                  padding: "3px 8px",
                                  borderRadius: "var(--radius-sm)",
                                  border: "1px solid var(--border)",
                                }}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

