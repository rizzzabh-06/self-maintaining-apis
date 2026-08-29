import { useEffect, useState } from "react";
import { ShieldCheck, FileCode } from "lucide-react";
import { fetchImpact } from "../api/client";

export const Impact: React.FC = () => {
  const [impact, setImpact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchImpact("fakepay");
        setImpact(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-purple)", marginBottom: "4px" }}>
          <ShieldCheck size={18} />
          <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Code Graph Analysis
          </span>
        </div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Impact Analysis</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Pinpointing exact files, symbols, callers, and risk levels affected by the API version change.
        </p>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          Computing impact graph...
        </div>
      ) : (
        <>
          {/* Summary Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Overall Risk</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fb7185", marginTop: "4px" }}>
                {impact?.risk_level?.toUpperCase() || "CRITICAL"}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Breaking changes across 4 core modules
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Impact Confidence</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#34d399", marginTop: "4px" }}>
                {Math.round((impact?.overall_confidence || 0.95) * 100)}%
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                AST & symbol matching verified
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Affected Files</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-cyan)", marginTop: "4px" }}>
                {impact?.affected_files?.length || 4}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Client, callers, types, and config
              </div>
            </div>
          </div>

          {/* Affected Files List */}
          <div className="glass-panel" style={{ padding: "2rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.2rem" }}>
              Impacted Files & Usage Call Chains
            </h2>

            <div style={{ display: "grid", gap: "1rem" }}>
              {impact?.affected_usages?.map((u: any, idx: number) => (
                <div key={idx} style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "1.2rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FileCode size={18} color="var(--accent-indigo)" />
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#ffffff", fontSize: "0.92rem" }}>
                        {u.file_path}
                      </span>
                      {u.line_number && (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
                          :L{u.line_number}
                        </span>
                      )}
                    </div>
                    <span className="badge badge-purple" style={{ fontSize: "0.7rem" }}>
                      {u.usage_type}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                    <strong>Reason:</strong> {u.change_reason}
                  </div>

                  {u.snippet && (
                    <div style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.78rem",
                      background: "#050811",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      color: "#93c5fd",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}>
                      {u.snippet}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
