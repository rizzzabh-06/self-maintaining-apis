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
  Lock,
} from "lucide-react";
import { fetchAutomationSettings, updateAutomationSettings, fetchSession } from "../api/client";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        background: checked ? "var(--blue)" : "var(--border)",
        border: `1px solid ${checked ? "var(--blue)" : "var(--border-dark)"}`,
        cursor: "pointer",
        position: "relative",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "2px",
          left: checked ? "calc(100% - 20px)" : "2px",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "var(--white)",
          transition: "left 0.2s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
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
      style={{ padding: "4px 10px", fontSize: "0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
    >
      {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
      <span style={{ marginLeft: "4px" }}>{copied ? "Copied" : "Copy"}</span>
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
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: "2rem" }}>
        <div className="section-eyebrow" style={{ color: "var(--blue)" }}>
          <Sliders size={15} />
          Workspace Settings
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)", margin: 0 }}>
          Automation & Integration Settings
        </h1>
        <p style={{ color: "var(--ink-light)", fontSize: "0.95rem", marginTop: "8px", maxWidth: "800px" }}>
          Configure scanning triggers, confidence gates, AST parsers, spec feeds, and GitHub App webhooks.
        </p>
      </div>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {/* Automation Controls */}
        <div className="card animate-fade-up" style={{ padding: "2rem" }}>
          <h2
            style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <ShieldCheck size={18} color="var(--success)" />
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
                  background: "var(--frost)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--ink)" }}>{item.label}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "2px" }}>
                    {item.desc}
                  </div>
                </div>
                <Toggle checked={item.value} onChange={item.onChange} />
              </div>
            ))}

            {/* Confidence Slider */}
            <div
              style={{
                padding: "16px",
                background: "var(--frost)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--ink)" }}>Minimum Confidence Gate</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "2px" }}>
                    Minimum confidence score required before opening a Draft PR
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "var(--ink)",
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
                style={{ width: "100%", accentColor: "var(--blue)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--ink-light)", marginTop: "6px" }}>
                <span>50% (Lenient)</span>
                <span>100% (Strict)</span>
              </div>
            </div>

            <div
              style={{
                background: "rgba(41, 181, 232, 0.05)",
                border: "1px solid rgba(41, 181, 232, 0.25)",
                borderLeft: "4px solid var(--blue)",
                borderRadius: "var(--radius-sm)",
                padding: "12px 16px",
                fontSize: "0.85rem",
                color: "var(--ink-medium)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Lock size={15} color="var(--blue)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--ink)" }}>Hard Invariant:</strong> All PRs generated by the agent have{" "}
                <code
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink)",
                    fontSize: "0.8rem",
                    background: "var(--white)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                  }}
                >
                  draft: true
                </code>{" "}
                set and require explicit human merge review.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <button className="btn-primary" onClick={handleSave} style={{ padding: "9px 20px" }}>
                {saved ? <CheckCircle size={15} /> : <Save size={15} />}
                <span>{saved ? "Settings Saved" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Multi-language AST */}
        <div className="card animate-fade-up" style={{ padding: "2rem" }}>
          <h2
            style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <GitBranch size={18} color="var(--blue)" />
            Multi-Language AST Parsers (Tree-sitter)
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-light)", marginBottom: "1.25rem" }}>
            Enable Tree-sitter parsers for additional languages. TypeScript is always active (regex AST parser).
          </p>

          <div style={{ display: "grid", gap: "10px" }}>
            {[
              { label: "TypeScript", value: true, onChange: () => {}, locked: true, badge: "badge-ts", desc: "Regex AST parser — always active" },
              { label: "Python", value: pythonAst, onChange: setPythonAst, badge: "badge-py", desc: "tree-sitter-python — detect imports, http calls, type annotations" },
              { label: "Go", value: goAst, onChange: setGoAst, badge: "badge-go", desc: "tree-sitter-go — detect package imports, struct fields, http client calls" },
              { label: "Java", value: javaAst, onChange: setJavaAst, badge: "badge-java", desc: "tree-sitter-java — detect package imports, method invocations, constructors" },
            ].map((lang) => (
              <div
                key={lang.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "var(--frost)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className={`badge ${lang.badge}`} style={{ fontSize: "0.7rem", fontWeight: 600 }}>{lang.label}</span>
                  <div style={{ fontSize: "0.82rem", color: "var(--ink-medium)" }}>{lang.desc}</div>
                </div>
                {lang.locked ? (
                  <span className="badge badge-success" style={{ fontSize: "0.68rem" }}>Active</span>
                ) : (
                  <Toggle checked={lang.value} onChange={lang.onChange} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Spec Feeds config */}
        <div className="card animate-fade-up" style={{ padding: "2rem" }}>
          <h2
            style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <Globe size={18} color="var(--blue)" />
            Spec Feed Configuration
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-light)", marginBottom: "1.25rem" }}>
            Configure polling interval for APIs.guru and npm RSS spec feeds.
          </p>
          <div style={{ display: "grid", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                background: "var(--frost)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--ink)" }}>Supabase Realtime Updates</div>
                <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "2px" }}>
                  Push live feed change events to the dashboard without page refresh
                </div>
              </div>
              <Toggle checked={realtimeEnabled} onChange={setRealtimeEnabled} />
            </div>

            <div
              style={{
                padding: "16px",
                background: "var(--frost)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--ink)" }}>Poll Interval</div>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>{specPollInterval} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={specPollInterval}
                onChange={(e) => setSpecPollInterval(parseInt(e.target.value))}
                style={{ width: "100%", accentColor: "var(--blue)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--ink-light)", marginTop: "6px" }}>
                <span>1 min (real-time)</span>
                <span>60 min (hourly)</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Provider */}
        <div className="card animate-fade-up" style={{ padding: "2rem" }}>
          <h2
            style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <Cpu size={18} color="var(--blue)" />
            AI & LLM Provider
          </h2>
          <div
            style={{
              background: "var(--frost)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "1.25rem 1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)" }}>Google Gemini API</div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "4px" }}>
                Model: <code style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", background: "var(--white)", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--border)" }}>gemini-2.5-flash</code>{" "}
                — Bounded context, deterministic-first fallback
              </div>
            </div>
            <span className="badge badge-success">Active</span>
          </div>
        </div>

        {/* GitHub Webhook */}
        <div className="card animate-fade-up" style={{ padding: "2rem" }}>
          <h2
            style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <Key size={18} color="var(--blue)" />
            GitHub App & Webhook Configuration
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-light)", marginBottom: "1.25rem" }}>
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
                color: "var(--success)",
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "var(--frost)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-light)", fontWeight: 600, marginBottom: "3px" }}>
                    {row.label}
                  </div>
                  <div
                    style={{
                      fontFamily: row.mono ? "var(--font-mono)" : "var(--font-sans)",
                      fontSize: row.mono ? "0.82rem" : "0.9rem",
                      color: row.color || "var(--ink)",
                      fontWeight: row.color ? 600 : 500,
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

