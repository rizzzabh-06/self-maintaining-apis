import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { fetchChanges } from "../api/client";

export const Changes: React.FC = () => {
  const [changesData, setChangesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchChanges();
        setChangesData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const changesList = Array.isArray(changesData) ? changesData : (changesData?.changes || []);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-rose)", marginBottom: "4px" }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Change Intelligence
          </span>
        </div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Detected Breaking Changes</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Structural AST differences between provider API versions requiring automated codebase transformations.
        </p>
      </div>

      {/* Provider Version Banner */}
      <div className="glass-panel" style={{ padding: "1.5rem 2rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(244, 63, 94, 0.15)", color: "#fb7185" }}>
            <ShieldAlert size={26} />
          </div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
              FakePay API Version Upgrade
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>v1.0.0</span>
              <ArrowRight size={14} />
              <span className="badge badge-critical" style={{ fontSize: "0.7rem" }}>v2.0.0</span>
              <span>• Released via Webhook Event</span>
            </div>
          </div>
        </div>

        <div>
          <span className="badge badge-critical" style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
            3 Breaking Changes Detected
          </span>
        </div>
      </div>

      {/* Changes List Cards */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {loading ? (
          <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading change intelligence...
          </div>
        ) : (
          changesList.map((c: any, idx: number) => (
            <div key={idx} className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="badge badge-critical">
                      {c.type || c.change_type || "BREAKING"}
                    </span>
                    <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {c.description}
                    </span>
                  </div>
                  {c.operation_id && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
                      Operation ID: {c.operation_id}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>
                  <div>Severity: <strong style={{ color: "#fb7185" }}>CRITICAL</strong></div>
                  <div>Evidence: OpenAPI Diff</div>
                </div>
              </div>

              {/* Before / After Comparison */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                <div style={{ background: "rgba(244, 63, 94, 0.06)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "8px", padding: "10px 14px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#fb7185", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>
                    Previous (v1.0.0)
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {c.old_path || (c.old_required !== undefined ? "currency: optional (default USD)" : "—")}
                  </div>
                </div>

                <div style={{ background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", padding: "10px 14px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>
                    New Contract (v2.0.0)
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#34d399" }}>
                    {c.new_path || (c.new_required !== undefined ? "currency: REQUIRED" : "—")}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
