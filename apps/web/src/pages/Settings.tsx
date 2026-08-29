import { useEffect, useState } from "react";
import { Sliders, ShieldCheck, Cpu, Key, CheckCircle, Save } from "lucide-react";
import { fetchAutomationSettings, updateAutomationSettings, fetchSession } from "../api/client";

export const Settings = () => {
  const [autoScanOnPush, setAutoScanOnPush] = useState(true);
  const [autoPrOnBreaking, setAutoPrOnBreaking] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.90);
  const [saved, setSaved] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const [auto, sess] = await Promise.all([
          fetchAutomationSettings(),
          fetchSession(),
        ]);
        setAutoScanOnPush(auto.auto_scan_on_push);
        setAutoPrOnBreaking(auto.auto_pr_on_breaking);
        setConfidenceThreshold(auto.confidence_threshold);
        setSession(sess);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      await updateAutomationSettings({
        auto_scan_on_push: autoScanOnPush,
        auto_pr_on_breaking: autoPrOnBreaking,
        confidence_threshold: confidenceThreshold,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-cyan)", marginBottom: "4px" }}>
          <Sliders size={18} />
          <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Workspace Settings
          </span>
        </div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Automation & Integration Settings</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Configure continuous repository scanning triggers, confidence gates, LLM providers, and GitHub App permissions.
        </p>
      </div>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {/* Automation Controls */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={20} color="var(--accent-emerald)" />
            Continuous Maintenance & Invariant Rules
          </h2>

          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Continuous Auto-Scan on Code Push</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Trigger AST inventory scanner on GitHub push webhook events
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoScanOnPush}
                onChange={(e) => setAutoScanOnPush(e.target.checked)}
                style={{ transform: "scale(1.3)", cursor: "pointer" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Autonomous Draft PR Generation</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Generate bounded migrations & open GitHub Draft PR when breaking API upgrades are detected
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoPrOnBreaking}
                onChange={(e) => setAutoPrOnBreaking(e.target.checked)}
                style={{ transform: "scale(1.3)", cursor: "pointer" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Minimum Confidence Gate for PR Generation</span>
                <span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{Math.round(confidenceThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-indigo)" }}
              />
            </div>

            <div style={{
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
            }}>
              🔒 <strong>Hard Invariant:</strong> All PRs generated by the agent have <code>draft: true</code> set and require explicit human merge review.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="btn-primary" onClick={handleSave}>
                {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                <span>{saved ? "Settings Saved!" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* LLM & AI Engine Configuration */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <Cpu size={20} color="var(--accent-indigo)" />
            AI & LLM Provider Configuration
          </h2>

          <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "1.2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Google Gemini API Provider</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Model: <code>gemini-2.5-flash</code> (Bounded context, deterministic fallback)
                </div>
              </div>
              <span className="badge badge-success">Active Provider</span>
            </div>
          </div>
        </div>

        {/* GitHub App & Webhook Information */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <Key size={20} color="var(--accent-purple)" />
            GitHub App & Ingestion Webhook
          </h2>

          <div style={{ display: "grid", gap: "12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <div>
              <strong>Authorized Organization:</strong> {session?.github?.account_login || "demo-org"}
            </div>
            <div>
              <strong>Webhook Receiver Endpoint:</strong> <code>https://your-domain.com/webhooks/provider</code>
            </div>
            <div>
              <strong>Database:</strong> <span style={{ color: "#34d399", fontWeight: 600 }}>Neon Lakebase Postgres (Connected)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
