import { useEffect, useState, useCallback } from "react";
import {
  Boxes,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Terminal,
  FolderGit2,
  GitPullRequest,
  Zap,
  Clock,
  Activity,
  TrendingUp,
} from "lucide-react";
import { fetchProviders, fetchRepositories, fetchChanges, fetchUsages } from "../api/client";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const PIPELINE_STEPS = [
  { label: "Provider Webhook", desc: "FakePay v2 released", icon: Zap, color: "#a855f7", status: "Triggered" },
  { label: "Change Engine", desc: "AST spec diff", icon: Activity, color: "#06b6d4", status: "3 Breaking" },
  { label: "Repo Scanner", desc: "4-tier AST discovery", icon: Terminal, color: "#6366f1", status: "Indexed" },
  { label: "Impact Engine", desc: "4 files affected", icon: AlertTriangle, color: "#f59e0b", status: "High Risk" },
  { label: "Migration Planner", desc: "Deterministic recipe", icon: TrendingUp, color: "#10b981", status: "98% Conf" },
  { label: "Isolated Sandbox", desc: "Build + unit tests", icon: CheckCircle2, color: "#34d399", status: "PASS ✓" },
  { label: "GitHub Draft PR", desc: "Human review gated", icon: GitPullRequest, color: "#818cf8", status: "Ready" },
];

const LANG_BREAKDOWN = [
  { lang: "TypeScript", pct: 68, cls: "badge-ts", barColor: "#60a5fa" },
  { lang: "Python", pct: 22, cls: "badge-py", barColor: "#fbbf24" },
  { lang: "Go", pct: 10, cls: "badge-go", barColor: "#67e8f9" },
];

type ActivityItem = {
  time: string;
  event: string;
  kind: "success" | "warning" | "info" | "error";
};

const MOCK_ACTIVITY: ActivityItem[] = [
  { time: "12:41", event: "FakePay v2.0.0 spec fetched via APIs.guru feed", kind: "info" },
  { time: "12:40", event: "Migration validated — PASS (100%) in isolated sandbox", kind: "success" },
  { time: "12:39", event: "3 breaking changes detected in OpenAPI diff", kind: "warning" },
  { time: "12:38", event: "TypeScript AST scan complete — 15 usages indexed", kind: "success" },
  { time: "12:35", event: "demo-checkout repository connected", kind: "info" },
];

const kindDot: Record<ActivityItem["kind"], string> = {
  success: "#34d399",
  warning: "#fbbf24",
  info: "#818cf8",
  error: "#fb7185",
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({ repos: 1, providers: 1, usages: 15, changes: 3, loading: true });
  const [activePipelineStep, setActivePipelineStep] = useState(6); // all done by default
  const [mounted, setMounted] = useState(false);

  const load = useCallback(async () => {
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
        changes: (c as any)?.total_changes || 3,
        loading: false,
      });
    } catch {
      setStats((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    load();
    setMounted(true);
  }, [load]);

  const metricCards = [
    {
      label: "Monitored Repos",
      value: stats.repos,
      sub: "Active: demo-checkout (TypeScript)",
      icon: FolderGit2,
      iconBg: "rgba(99,102,241,0.15)",
      iconColor: "#818cf8",
      tab: "repositories",
    },
    {
      label: "External Providers",
      value: stats.providers,
      sub: "FakePay v1.0.0 → v2.0.0 detected",
      icon: Boxes,
      iconBg: "rgba(6,182,212,0.15)",
      iconColor: "#22d3ee",
      tab: "inventory",
    },
    {
      label: "Breaking Changes",
      value: stats.changes,
      sub: "Endpoint renames + required fields",
      icon: AlertTriangle,
      iconBg: "rgba(244,63,94,0.15)",
      iconColor: "#fb7185",
      tab: "changes",
      valueColor: "#fb7185",
    },
    {
      label: "Indexed Usages",
      value: stats.usages,
      sub: "Exact symbols & line numbers mapped",
      icon: CheckCircle2,
      iconBg: "rgba(16,185,129,0.15)",
      iconColor: "#34d399",
      tab: "inventory",
    },
  ];

  return (
    <div style={{ maxWidth: "1500px", margin: "0 auto", padding: "2rem 1.5rem" }}>

      {/* Hero */}
      <div
        className="glass-panel animate-fade-up"
        style={{
          padding: "2.5rem",
          marginBottom: "1.5rem",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(10,15,30,0.95), rgba(25,20,60,0.7))",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        {/* Decorative blobs */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-40px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-40px",
            left: "30%",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: "680px", position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              background: "rgba(99,102,241,0.12)",
              padding: "4px 12px",
              borderRadius: "var(--radius-full)",
              border: "1px solid rgba(99,102,241,0.28)",
              marginBottom: "1rem",
            }}
          >
            <Sparkles size={12} color="var(--accent-cyan)" />
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--accent-cyan)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Autonomous Code Maintenance Engine
            </span>
          </div>

          <h1
            style={{
              fontSize: "2.4rem",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              marginBottom: "0.75rem",
              lineHeight: 1.18,
            }}
          >
            Detects Breaking APIs.
            <br />
            <span
              style={{
                background: "linear-gradient(to right, #38bdf8, #818cf8, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundSize: "200% auto",
                animation: "gradientShift 5s ease infinite",
              }}
            >
              Rewrites, Validates & PRs.
            </span>
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              marginBottom: "1.75rem",
              lineHeight: 1.65,
            }}
          >
            Deterministic-first transformation engine backed by Tree-sitter AST analysis, isolated sandbox
            validation, and strict Draft-PR-only human gating. Zero auto-deploys.
          </p>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => onNavigate("migration")}>
              <span>Launch Migration Console</span>
              <ArrowRight size={15} />
            </button>
            <button className="btn-secondary" onClick={() => onNavigate("inventory")}>
              <Boxes size={15} />
              <span>API Inventory</span>
            </button>
            <button className="btn-secondary" onClick={() => onNavigate("specfeeds")}>
              <Activity size={15} />
              <span>Spec Feeds</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div
        className="stagger"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="glass-panel glass-panel-interactive animate-fade-up"
              style={{ padding: "1.4rem", cursor: "pointer" }}
              onClick={() => onNavigate(card.tab)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.75rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {card.label}
                </span>
                <div
                  style={{
                    padding: "7px",
                    borderRadius: "8px",
                    background: card.iconBg,
                    color: card.iconColor,
                  }}
                >
                  <Icon size={16} />
                </div>
              </div>
              <div
                style={{
                  fontSize: "2.1rem",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: card.valueColor || "var(--text-primary)",
                  lineHeight: 1,
                  marginBottom: "6px",
                }}
              >
                {stats.loading ? (
                  <div className="skeleton" style={{ width: "40px", height: "32px", display: "inline-block" }} />
                ) : (
                  card.value
                )}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Main content grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", marginBottom: "1.5rem" }}>

        {/* Pipeline Timeline */}
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <h2
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Terminal size={18} color="var(--accent-indigo)" />
            Autonomous Pipeline
            <span
              className="badge badge-success"
              style={{ marginLeft: "auto", fontSize: "0.65rem" }}
            >
              PASS (100%)
            </span>
          </h2>

          <div className="pipeline-timeline" style={{ gap: "0" }}>
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isComplete = idx <= activePipelineStep;
              const isActive = idx === activePipelineStep;
              return (
                <div
                  key={step.label}
                  className="pipeline-step"
                  style={{ minWidth: "110px" }}
                  onMouseEnter={() => setActivePipelineStep(idx)}
                  onMouseLeave={() => setActivePipelineStep(6)}
                >
                  {/* Connector line */}
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "18px",
                        left: "calc(50% + 18px)",
                        width: "calc(100% - 36px)",
                        height: "2px",
                        background: isComplete
                          ? "linear-gradient(90deg, rgba(16,185,129,0.8), rgba(16,185,129,0.3))"
                          : "rgba(255,255,255,0.06)",
                        transition: "background 0.5s ease",
                        zIndex: 0,
                      }}
                    />
                  )}

                  <div
                    className="pipeline-step-dot"
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${isComplete ? step.color : "rgba(255,255,255,0.1)"}`,
                      background: isComplete ? `${step.color}22` : "rgba(255,255,255,0.03)",
                      boxShadow: isActive ? `0 0 16px ${step.color}55` : "none",
                      zIndex: 1,
                      transition: "all 0.25s ease",
                    }}
                  >
                    <Icon size={16} color={isComplete ? step.color : "var(--text-muted)"} />
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      textAlign: "center",
                      padding: "0 4px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: isComplete ? "var(--text-primary)" : "var(--text-muted)",
                        marginBottom: "2px",
                        transition: "color 0.2s",
                      }}
                    >
                      {step.label}
                    </div>
                    <span
                      className="badge badge-success"
                      style={{
                        fontSize: "0.6rem",
                        opacity: isComplete ? 1 : 0.35,
                        transition: "opacity 0.2s",
                      }}
                    >
                      {step.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Language Breakdown */}
          <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-subtle)" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "1rem",
              }}
            >
              AST Coverage by Language
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {LANG_BREAKDOWN.map((l) => (
                <div key={l.lang} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    className={`badge ${l.cls}`}
                    style={{ fontSize: "0.65rem", minWidth: "80px", justifyContent: "center" }}
                  >
                    {l.lang}
                  </span>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{
                        width: mounted ? `${l.pct}%` : "0%",
                        background: `linear-gradient(90deg, ${l.barColor}88, ${l.barColor})`,
                      }}
                    />
                  </div>
                  <span
                    style={{ fontSize: "0.75rem", fontWeight: 700, color: l.barColor, minWidth: "32px" }}
                  >
                    {l.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
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
            <Clock size={16} color="var(--accent-cyan)" />
            Activity Feed
          </h2>

          <div className="activity-feed stagger">
            {MOCK_ACTIVITY.map((item, idx) => (
              <div key={idx} className="activity-item animate-fade-up">
                <div
                  className="activity-dot"
                  style={{ background: kindDot[item.kind], boxShadow: `0 0 6px ${kindDot[item.kind]}` }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {item.event}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "3px" }}>
                    Today at {item.time}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn-ghost"
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem", fontSize: "0.78rem" }}
            onClick={() => onNavigate("migration")}
          >
            View all pipeline runs
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
