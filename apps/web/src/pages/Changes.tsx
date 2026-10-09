import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, ArrowRight, ShieldAlert, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { fetchChanges } from "../api/client";

const SEVERITY_COLORS: Record<string, { bar: string; badge: string; bg: string }> = {
  critical: { bar: "#f43f5e", badge: "badge-critical", bg: "rgba(244,63,94,0.06)" },
  high: { bar: "#f59e0b", badge: "badge-warning", bg: "rgba(245,158,11,0.06)" },
  medium: { bar: "#6366f1", badge: "badge-indigo", bg: "rgba(99,102,241,0.06)" },
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
    <div style={{ maxWidth: "1500px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: "1.75rem" }}>
        <div className="section-eyebrow" style={{ color: "var(--accent-rose)" }}>
          <AlertTriangle size={16} />
          Change Intelligence
        </div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
          Detected Breaking Changes
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "4px" }}>
          Structural AST differences between provider API versions requiring automated codebase transformations.
        </p>
      </div>

      {/* Provider Version Banner */}
      <div
        className="glass-panel animate-fade-up"
        style={{
          padding: "1.25rem 1.75rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, rgba(244,63,94,0.06), rgba(15,23,42,0.8))",
          border: "1px solid rgba(244,63,94,0.18)",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              padding: "10px",
              borderRadius: "10px",
              background: "rgba(244,63,94,0.12)",
              color: "#fb7185",
              boxShadow: "var(--glow-rose)",
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 800 }}>FakePay API Version Upgrade</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px" }}>
              <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>
                v1.0.0
              </span>
              <ArrowRight size={12} color="var(--text-muted)" />
              <span className="badge badge-critical" style={{ fontSize: "0.68rem" }}>
                v2.0.0
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                • Triggered via Webhook Event
              </span>
            </div>
          </div>
        </div>
        <span className="badge badge-critical" style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
          <Zap size={12} />
          {loading ? "…" : changesList.length} Breaking Changes
        </span>
      </div>

      {/* Timeline changes list */}
      <div
        style={{ position: "relative", paddingLeft: "28px" }}
      >
        {/* Vertical timeline connector */}
        {!loading && changesList.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: "8px",
              top: "12px",
              bottom: "12px",
              width: "2px",
              background: "linear-gradient(180deg, rgba(244,63,94,0.5), rgba(99,102,241,0.2))",
              borderRadius: "2px",
            }}
          />
        )}

        <div className="stagger" style={{ display: "grid", gap: "1rem" }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-panel skeleton" style={{ height: "100px" }} />
            ))
          ) : changesList.length === 0 ? (
            <div
              className="glass-panel"
              style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}
            >
              No breaking changes detected.
            </div>
          ) : (
            changesList.map((c: any, idx: number) => {
              const sev = getSeverity(c);
              const { bar, badge, bg } = SEVERITY_COLORS[sev] || SEVERITY_COLORS.critical;
              const isExpanded = expandedIdx === idx;

              return (
                <div
                  key={idx}
                  className="glass-panel animate-fade-up"
                  style={{
                    overflow: "hidden",
                    position: "relative",
                    background: bg,
                    borderLeft: `3px solid ${bar}`,
                    cursor: "pointer",
                    transition: "box-shadow var(--transition-base)",
                  }}
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                >
                  {/* Timeline dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-36px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: bar,
                      boxShadow: `0 0 10px ${bar}`,
                      border: "2px solid var(--bg-primary)",
                    }}
                  />

                  <div style={{ padding: "1.25rem 1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                          <span className={`badge ${badge}`} style={{ fontSize: "0.65rem" }}>
                            {sev.toUpperCase()}
                          </span>
                          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            {c.description}
                          </span>
                        </div>
                        {c.operation_id && (
                          <div
                            style={{
                              fontSize: "0.76rem",
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            Operation: {c.operation_id}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          <div>
                            Evidence: <strong style={{ color: "var(--text-secondary)" }}>OpenAPI Diff</strong>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={15} color="var(--text-muted)" />
                        ) : (
                          <ChevronDown size={15} color="var(--text-muted)" />
                        )}
                      </div>
                    </div>

                    {/* Inline Before/After — always visible */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "1rem" }}>
                      <div
                        style={{
                          background: "rgba(244,63,94,0.07)",
                          border: "1px solid rgba(244,63,94,0.18)",
                          borderRadius: "var(--radius-sm)",
                          padding: "8px 12px",
                        }}
                      >
                        <div style={{ fontSize: "0.65rem", color: "#fb7185", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>
                          Previous (v1.0.0)
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          {c.old_path || (c.old_required !== undefined ? "currency: optional" : "—")}
                        </div>
                      </div>
                      <div
                        style={{
                          background: "rgba(16,185,129,0.07)",
                          border: "1px solid rgba(16,185,129,0.18)",
                          borderRadius: "var(--radius-sm)",
                          padding: "8px 12px",
                        }}
                      >
                        <div style={{ fontSize: "0.65rem", color: "#34d399", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>
                          New Contract (v2.0.0)
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "#4ade80" }}>
                          {c.new_path || (c.new_required !== undefined ? "currency: REQUIRED" : "—")}
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div
                        className="animate-fade-up"
                        style={{
                          marginTop: "1rem",
                          paddingTop: "1rem",
                          borderTop: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                          <strong style={{ color: "var(--text-primary)" }}>Impact:</strong> This breaking change
                          affects all call sites that invoke this endpoint path or use the associated type
                          contract. The Migration Engine will apply a deterministic FakePayV1ToV2 recipe to
                          rewrite all affected usages automatically.
                        </div>
                        {c.affected_files && (
                          <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {c.affected_files.map((f: string) => (
                              <span
                                key={f}
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "0.72rem",
                                  background: "rgba(99,102,241,0.1)",
                                  color: "#818cf8",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid rgba(99,102,241,0.2)",
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
