import { useEffect, useState } from "react";
import {
  Sliders,
  ShieldCheck,
  Cpu,
  Key,
  CheckCircle,
  Save,
  Globe,
  GitBranch,
  Copy,
  Check,
} from "lucide-react";
import { fetchAutomationSettings, updateAutomationSettings, fetchSession } from "../api/client";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: "46px",
        height: "26px",
        borderRadius: "13px",
        background: checked
          ? "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))"
          : "rgba(255,255,255,0.1)",
        border: `1px solid ${checked ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.12)"}`,
        cursor: "pointer",
        position: "relative",
        transition: "all 0.25s ease",
        flexShrink: 0,
        boxShadow: checked ? "0 0 12px rgba(99,102,241,0.3)" : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "3px",
          left: checked ? "calc(100% - 21px)" : "3px",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "#ffffff",
          transition: "left 0.22s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      className="btn-ghost"
      onClick={handleCopy}
      style={{ padding: "4px 8px", fontSize: "0.72rem" }}
    >
      {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export const Settings = () => {
  const [autoScanOnPush, setAutoScanOnPush] = useState(true);
  const [autoPrOnBreaking, setAutoPrOnBreaking] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.90);
  const [saved, setSaved] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [pythonAst, setPythonAst] = useState(true);
  const [goAst, setGoAst] = useState(false);
  const [javaAst, setJavaAst] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [specPollInterval, setSpecPollInterval] = useState(5);

  useEffect(() => {
    async function load() {
      try {
        const [auto, sess] = await Promise.all([
          fetchAutomationSettings(),
          fetchSession(),
        ]);
        setAutoScanOnPush(auto.auto_scan_on_push ?? true);
        setAutoPrOnBreaking(auto.auto_pr_on_breaking ?? true);
        setConfidenceThreshold(auto.confidence_threshold ?? 0.9);
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

  const WEBHOOK_URL = "http://localhost:8000/webhooks/github";

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: "1.75rem" }}>
        <div className="section-eyebrow" style={{ color: "var(--accent-cyan)" }}>
          <Sliders size={16} />
          Workspace Settings
        </div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
          Automation & Integration Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "4px" }}>
          Configure scanning triggers, confidence gates, AST parsers, spec feeds, and GitHub App webhooks.
        </p>
      </div>

      <div style={{ display: "grid", gap: "1.25rem" }}>
        {/* Automation Controls */}
        <div className="glass-panel animate-fade-up" style={{ padding: "2rem" }}>
          <h2
            style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <ShieldCheck size={18} color="var(--accent-emerald)" />
            Continuous Maintenance Rules
          </h2>

          <div style={{ display: "grid", gap: "1.25rem" }}>
            {[
              {
                label: "Continuous Auto-Scan on Code Push",
                desc: "Trigger incremental AST scanner on GitHub push webhook events",
                value: autoScanOnPush,
                onChange: setAutoScanOnPush,
              },
              {
                label: "Autonomous Draft PR Generation",
                desc: "Open GitHub Draft PR automatically when breaking API upgrades are detected and validation passes",
                value: autoPrOnBreaking,
                onChange: setAutoPrOnBreaking,
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.label}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {item.desc}
                  </div>
                </div>
                <Toggle checked={item.value} onChange={item.onChange} />
              </div>
            ))}

            {/* Confidence Slider */}
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Minimum Confidence Gate</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Minimum confidence score required before opening a Draft PR
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: 800,
                    color: "var(--accent-cyan)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {Math.round(confidenceThreshold * 100)}%
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-indigo)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                <span>50% (Lenient)</span>
                <span>100% (Strict)</span>
              </div>
            </div>

            <div
              style={{
                background: "rgba(99,102,241,0.06)",
                border: "1px solid rgba(99,102,241,0.18)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
              }}
            >
              🔒 <strong>Hard Invariant:</strong> All PRs generated by the agent have{" "}
              <code
                style={{ fontFamily: "var(--font-mono)", color: "var(--accent-cyan)", fontSize: "0.78rem" }}
              >
                draft: true
              </code>{" "}
              set and require explicit human merge review.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-primary" onClick={handleSave}>
                {saved ? <CheckCircle size={15} /> : <Save size={15} />}
                <span>{saved ? "Settings Saved!" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Multi-language AST */}
        <div className="glass-panel animate-fade-up" style={{ padding: "2rem" }}>
          <h2
            style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <GitBranch size={18} color="var(--accent-indigo)" />
            Multi-Language AST Parsers (Tree-sitter)
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            Enable Tree-sitter parsers for additional languages. TypeScript is always active (regex AST parser).
          </p>

          <div style={{ display: "grid", gap: "10px" }}>
            {[
              { label: "TypeScript", value: true, onChange: () => {}, locked: true, badge: "badge-ts", desc: "Regex AST parser — always active" },
              { label: "Python 🐍", value: pythonAst, onChange: setPythonAst, badge: "badge-py", desc: "tree-sitter-python — detect imports, http calls, type annotations" },
              { label: "Go 🔵", value: goAst, onChange: setGoAst, badge: "badge-go", desc: "tree-sitter-go — detect package imports, struct fields, http client calls" },
              { label: "Java ☕", value: javaAst, onChange: setJavaAst, badge: "badge-java", desc: "tree-sitter-java — detect package imports, method invocations, constructors" },
            ].map((lang) => (
              <div
                key={lang.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  background: lang.value ? "rgba(99,102,241,0.04)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${lang.value ? "rgba(99,102,241,0.18)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  transition: "all var(--transition-base)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={`badge ${lang.badge}`} style={{ fontSize: "0.65rem" }}>{lang.label}</span>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{lang.desc}</div>
                </div>
                {lang.locked ? (
                  <span className="badge badge-success" style={{ fontSize: "0.65rem" }}>Active</span>
                ) : (
                  <Toggle checked={lang.value} onChange={lang.onChange} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Spec Feeds config */}
        <div className="glass-panel animate-fade-up" style={{ padding: "2rem" }}>
          <h2
            style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Globe size={18} color="var(--accent-amber)" />
            Spec Feed Configuration
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            Configure polling interval for APIs.guru and npm RSS spec feeds.
          </p>
          <div style={{ display: "grid", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Supabase Realtime Updates</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Push live feed change events to the dashboard without page refresh
                </div>
              </div>
              <Toggle checked={realtimeEnabled} onChange={setRealtimeEnabled} />
            </div>

            <div
              style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Poll Interval</div>
                <span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{specPollInterval} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={specPollInterval}
                onChange={(e) => setSpecPollInterval(parseInt(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-amber)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                <span>1 min (real-time)</span>
                <span>60 min (hourly)</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Provider */}
        <div className="glass-panel animate-fade-up" style={{ padding: "2rem" }}>
          <h2
            style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Cpu size={18} color="var(--accent-indigo)" />
            AI & LLM Provider
          </h2>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1.2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Google Gemini API</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Model: <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>gemini-2.5-flash</code>{" "}
                — Bounded context, deterministic-first fallback
              </div>
            </div>
            <span className="badge badge-success">Active</span>
          </div>
        </div>

        {/* GitHub Webhook */}
        <div className="glass-panel animate-fade-up" style={{ padding: "2rem" }}>
          <h2
            style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Key size={18} color="var(--accent-purple)" />
            GitHub App & Webhook Configuration
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            Configure your GitHub App webhook to point to the local receiver endpoint for push event scanning.
          </p>
          <div style={{ display: "grid", gap: "10px", fontSize: "0.85rem" }}>
            {[
              {
                label: "Organization",
                value: session?.github?.account_login || "demo-org",
                mono: false,
              },
              {
                label: "Push Webhook Endpoint",
                value: WEBHOOK_URL,
                mono: true,
                copy: true,
              },
              {
                label: "Provider Webhook Endpoint",
                value: "http://localhost:8000/webhooks/provider",
                mono: true,
                copy: true,
              },
              {
                label: "Database",
                value: "Neon Lakebase Postgres (Connected)",
                color: "#34d399",
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "2px" }}>
                    {row.label}
                  </div>
                  <div
                    style={{
                      fontFamily: row.mono ? "var(--font-mono)" : "var(--font-sans)",
                      fontSize: row.mono ? "0.78rem" : "0.85rem",
                      color: row.color || "var(--text-primary)",
                      fontWeight: row.color ? 600 : 400,
                    }}
                  >
                    {row.value}
                  </div>
                </div>
                {row.copy && <CopyButton text={row.value} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
