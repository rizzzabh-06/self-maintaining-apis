import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import {
  Boxes,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FolderGit2,
  Clock,
  Activity,
  Loader2,
} from "lucide-react";
import { fetchProviders, fetchRepositories, fetchChanges, fetchUsages } from "../api/client";

const PipelineMap = lazy(() => import("../components/PipelineMap").then(m => ({ default: m.PipelineMap })));

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const LANG_BREAKDOWN = [
  { lang: "TypeScript", pct: 68, barColor: "var(--blue)" },
  { lang: "Python", pct: 22, barColor: "var(--warning)" },
  { lang: "Go", pct: 10, barColor: "var(--success)" },
];

type ActivityItem = {
  time: string;
  event: string;
  kind: "success" | "warning" | "info" | "error";
};

const MOCK_ACTIVITY: ActivityItem[] = [
  { time: "12:41", event: "FakePay v2.0.0 spec fetched via APIs.guru feed", kind: "info" },
  { time: "12:40", event: "Migration validated -- PASS (100%) in isolated sandbox", kind: "success" },
  { time: "12:39", event: "3 breaking changes detected in OpenAPI diff", kind: "warning" },
  { time: "12:38", event: "TypeScript AST scan complete -- 15 usages indexed", kind: "success" },
  { time: "12:35", event: "demo-checkout repository connected", kind: "info" },
];

const kindDot: Record<ActivityItem["kind"], string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  info: "var(--blue)",
  error: "var(--error)",
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({ repos: 1, providers: 1, usages: 15, changes: 3, loading: true });
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
      iconColor: "var(--blue)",
      tab: "repositories",
    },
    {
      label: "External Providers",
      value: stats.providers,
      sub: "FakePay v1.0.0 to v2.0.0 detected",
      icon: Boxes,
      iconColor: "var(--blue)",
      tab: "inventory",
    },
    {
      label: "Breaking Changes",
      value: stats.changes,
      sub: "Endpoint renames + required fields",
      icon: AlertTriangle,
      iconColor: "var(--error)",
      tab: "changes",
      valueColor: "var(--error)",
    },
    {
      label: "Indexed Usages",
      value: stats.usages,
      sub: "Exact symbols & line numbers mapped",
      icon: CheckCircle2,
      iconColor: "var(--success)",
      tab: "inventory",
    },
  ];

  return (
    <div style={{ maxWidth: "1500px", margin: "0 auto", padding: "2rem 1.5rem" }}>

      {/* Hero */}
      <div
        className="card animate-fade-up"
        style={{
          padding: "2.5rem",
          marginBottom: "1.5rem",
          position: "relative",
          overflow: "hidden",
          background: "var(--white)",
        }}
      >
        <div style={{ maxWidth: "680px", position: "relative" }}>
          <div className="section-eyebrow" style={{ marginBottom: "0.75rem" }}>
            Autonomous Code Maintenance Engine
          </div>

          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "0.75rem",
              lineHeight: 1.15,
              color: "var(--ink)",
            }}
          >
            Detects Breaking APIs.
            <br />
            <span style={{ color: "var(--blue)" }}>
              Rewrites, Validates & PRs.
            </span>
          </h1>

          <p
            style={{
              color: "var(--ink-light)",
              fontSize: "0.9375rem",
              marginBottom: "1.5rem",
              lineHeight: 1.65,
              maxWidth: "580px",
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
              className="card card-interactive animate-fade-up"
              style={{ padding: "1.25rem" }}
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
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: "var(--ink-light)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {card.label}
                </span>
                <div
                  style={{
                    padding: "6px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--blue-wash)",
                    color: card.iconColor,
                  }}
                >
                  <Icon size={16} />
                </div>
              </div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: card.valueColor || "var(--ink)",
                  lineHeight: 1,
                  marginBottom: "4px",
                }}
              >
                {stats.loading ? (
                  <div className="skeleton" style={{ width: "40px", height: "28px", display: "inline-block" }} />
                ) : (
                  card.value
                )}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-light)" }}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Main content grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", marginBottom: "1.5rem" }}>

        {/* Pipeline Map & AI Inspector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Suspense fallback={
            <div className="card" style={{ padding: "2rem", display: "flex", justifyContent: "center", color: "var(--blue)" }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          }>
            <PipelineMap onStageSelect={(stageId) => {
              if (stageId === "ast-scanner") onNavigate("repositories");
              if (stageId === "ai-synthesis" || stageId === "sandbox-validation") onNavigate("migration");
              if (stageId === "spec-ingest" || stageId === "change-engine") onNavigate("changes");
            }} />
          </Suspense>

          {/* Language Breakdown Card */}
          <div className="card" style={{ padding: "1.25rem 1.75rem" }}>
            <div
              style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                color: "var(--ink-light)",
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
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      minWidth: "80px",
                      color: "var(--ink-medium)",
                    }}
                  >
                    {l.lang}
                  </span>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{
                        width: mounted ? `${l.pct}%` : "0%",
                        background: l.barColor,
                      }}
                    />
                  </div>
                  <span
                    style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-medium)", minWidth: "32px" }}
                  >
                    {l.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card" style={{ padding: "1.75rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--ink)",
            }}
          >
            <Clock size={16} color="var(--blue)" />
            Activity Feed
          </h2>

          <div className="activity-feed stagger">
            {MOCK_ACTIVITY.map((item, idx) => (
              <div key={idx} className="activity-item animate-fade-up">
                <div
                  className="activity-dot"
                  style={{ background: kindDot[item.kind] }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.8125rem", color: "var(--ink-medium)", lineHeight: 1.4 }}>
                    {item.event}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--gray-400)", marginTop: "3px" }}>
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
