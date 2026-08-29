import React, { useEffect, useState } from "react";
import { 
  GitPullRequest, 
  ShieldCheck, 
  Boxes, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Terminal,
  RefreshCw,
  FolderGit2
} from "lucide-react";
import { fetchProviders, fetchRepositories, fetchChanges, fetchUsages } from "../api/client";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    repos: 1,
    providers: 1,
    usages: 15,
    changes: 3,
    loading: true,
  });

  useEffect(() => {
    async function load() {
      try {
        const [p, r, u, c] = await Promise.all([
          fetchProviders().catch(() => []),
          fetchRepositories().catch(() => []),
          fetchUsages().catch(() => []),
          fetchChanges().catch(() => ({ total_changes: 3 })),
        ]);
        setStats({
          repos: Array.isArray(r) ? r.length : 1,
          providers: Array.isArray(p) ? p.length : 1,
          usages: Array.isArray(u) ? u.length : 15,
          changes: c?.total_changes || 3,
          loading: false,
        });
      } catch (err) {
        setStats((s) => ({ ...s, loading: false }));
      }
    }
    load();
  }, []);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      {/* Hero Banner */}
      <div className="glass-panel" style={{
        padding: "2.5rem",
        marginBottom: "2rem",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 27, 75, 0.5))",
        border: "1px solid rgba(99, 102, 241, 0.25)",
      }}>
        <div style={{ maxWidth: "750px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(99, 102, 241, 0.15)", padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(99, 102, 241, 0.3)", marginBottom: "1rem" }}>
            <Sparkles size={14} color="var(--accent-cyan)" />
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-cyan)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Autonomous Code Maintenance Engine
            </span>
          </div>

          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.8rem", lineHeight: 1.2 }}>
            Detects Breaking APIs. Rewrites Code. <br/>
            <span style={{ background: "linear-gradient(to right, #38bdf8, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Validates in Sandboxes. Opens Draft PRs.
            </span>
          </h1>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.98rem", marginBottom: "1.8rem", lineHeight: 1.6 }}>
            Deterministic-first transformation engine backed by isolated container validation. Never auto-deploys or merges into production without explicit human review.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => onNavigate("migration")}>
              <span>Launch Migration Console</span>
              <ArrowRight size={16} />
            </button>
            <button className="btn-secondary" onClick={() => onNavigate("inventory")}>
              <Boxes size={16} />
              <span>Explore API Inventory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="glass-panel glass-panel-interactive" style={{ padding: "1.5rem" }} onClick={() => onNavigate("inventory")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Monitored Repos</span>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
              <FolderGit2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800 }}>{stats.repos}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            <span style={{ color: "#34d399", fontWeight: 600 }}>Active:</span> demo-checkout (TypeScript)
          </div>
        </div>

        <div className="glass-panel glass-panel-interactive" style={{ padding: "1.5rem" }} onClick={() => onNavigate("inventory")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>External Providers</span>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" }}>
              <Boxes size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800 }}>{stats.providers}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            FakePay (v1.0.0 → v2.0.0 detected)
          </div>
        </div>

        <div className="glass-panel glass-panel-interactive" style={{ padding: "1.5rem" }} onClick={() => onNavigate("changes")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Detected Breaking Changes</span>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(244, 63, 94, 0.15)", color: "#fb7185" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fb7185" }}>{stats.changes}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Endpoints renamed + Required field
          </div>
        </div>

        <div className="glass-panel glass-panel-interactive" style={{ padding: "1.5rem" }} onClick={() => onNavigate("inventory")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Indexed API Usages</span>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800 }}>{stats.usages}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Exact symbols & lines mapped
          </div>
        </div>
      </div>

      {/* Autonomous Pipeline Architecture Visualizer */}
      <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <Terminal size={20} color="var(--accent-indigo)" />
          Autonomous Pipeline Architecture
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
          {[
            { step: "1. Provider Webhook", desc: "FakePay v2 released", status: "Triggered" },
            { step: "2. Change Engine", desc: "AST Spec Diffing", status: "3 Breaking" },
            { step: "3. Repo Scanner", desc: "15 Usages mapped", status: "Indexed" },
            { step: "4. Impact Engine", desc: "4 Files affected", status: "High Risk" },
            { step: "5. Migration Planner", desc: "Deterministic Recipe", status: "98% Conf" },
            { step: "6. Isolated Sandbox", desc: "Build + Unit Tests", status: "PASS (100%)" },
            { step: "7. GitHub Draft PR", desc: "Human Review Gated", status: "Ready" },
          ].map((item, idx) => (
            <div key={idx} style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
              padding: "1rem",
              textAlign: "left",
            }}>
              <div style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontWeight: 700, textTransform: "uppercase" }}>
                {item.step}
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "4px" }}>
                {item.desc}
              </div>
              <div style={{ marginTop: "8px" }}>
                <span className="badge badge-success" style={{ fontSize: "0.68rem" }}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
