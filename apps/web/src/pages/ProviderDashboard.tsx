import React, { useState, useEffect, useCallback } from "react";
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  Clock,
  Zap,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  Activity,
} from "lucide-react";

interface ProviderVersion {
  version: string;
  released_at: string;
  breaking_changes: number;
}

interface Provider {
  id: string;
  name: string;
  slug: string;
  health: "healthy" | "degraded" | "down";
  current_version: string;
  latest_version: string;
  webhook_active: boolean;
  last_checked: string;
  usages_count: number;
  repos_affected: number;
  version_history: ProviderVersion[];
}

// --- Mock data while backend endpoint is scaffolded ---
const MOCK_PROVIDERS: Provider[] = [
  {
    id: "prov-fakepay",
    name: "FakePay",
    slug: "fakepay",
    health: "healthy",
    current_version: "v1.0.0",
    latest_version: "v2.0.0",
    webhook_active: true,
    last_checked: "2026-11-11T18:40:00Z",
    usages_count: 51,
    repos_affected: 2,
    version_history: [
      { version: "v2.0.0", released_at: "2026-11-09T12:00:00Z", breaking_changes: 3 },
      { version: "v1.2.0", released_at: "2026-10-15T09:00:00Z", breaking_changes: 0 },
      { version: "v1.1.0", released_at: "2026-09-20T09:00:00Z", breaking_changes: 1 },
      { version: "v1.0.0", released_at: "2026-08-01T09:00:00Z", breaking_changes: 0 },
    ],
  },
  {
    id: "prov-stripe",
    name: "Stripe",
    slug: "stripe",
    health: "healthy",
    current_version: "v3.0.0",
    latest_version: "v3.1.0",
    webhook_active: true,
    last_checked: "2026-11-11T19:05:00Z",
    usages_count: 20,
    repos_affected: 1,
    version_history: [
      { version: "v3.1.0", released_at: "2026-11-01T10:00:00Z", breaking_changes: 1 },
      { version: "v3.0.0", released_at: "2026-07-15T10:00:00Z", breaking_changes: 2 },
      { version: "v2.9.0", released_at: "2026-04-10T10:00:00Z", breaking_changes: 0 },
    ],
  },
  {
    id: "prov-twilio",
    name: "Twilio",
    slug: "twilio",
    health: "degraded",
    current_version: "v2.4.1",
    latest_version: "v2.4.1",
    webhook_active: false,
    last_checked: "2026-11-11T17:20:00Z",
    usages_count: 8,
    repos_affected: 1,
    version_history: [
      { version: "v2.4.1", released_at: "2026-10-30T08:00:00Z", breaking_changes: 0 },
      { version: "v2.4.0", released_at: "2026-09-05T08:00:00Z", breaking_changes: 1 },
    ],
  },
];

function healthPill(health: Provider["health"]) {
  const map = {
    healthy: { color: "var(--success)", bg: "var(--success-wash)", label: "Healthy", Icon: CheckCircle2 },
    degraded: { color: "var(--warning)", bg: "rgba(245,158,11,0.1)", label: "Degraded", Icon: AlertTriangle },
    down: { color: "var(--error)", bg: "rgba(239,68,68,0.08)", label: "Down", Icon: XCircle },
  };
  const s = map[health];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px",
        borderRadius: "var(--radius-full)",
        fontSize: "0.6875rem",
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        letterSpacing: "0.04em",
      }}
    >
      <s.Icon size={11} />
      {s.label}
    </span>
  );
}

function HealthPulse({ health }: { health: Provider["health"] }) {
  const color =
    health === "healthy" ? "var(--success)" : health === "degraded" ? "var(--warning)" : "var(--error)";
  return (
    <span
      style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 0 3px ${color}33`,
        animation: health === "healthy" ? "ping 2s cubic-bezier(0,0,0.2,1) infinite" : undefined,
        flexShrink: 0,
      }}
    />
  );
}

function VersionTimeline({ versions }: { versions: ProviderVersion[] }) {
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {versions.map((v, i) => (
        <div key={v.version} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
          {/* Timeline spine */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", flexShrink: 0 }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: i === 0 ? "var(--blue)" : "var(--border)",
                border: `2px solid ${i === 0 ? "var(--blue)" : "var(--border)"}`,
                flexShrink: 0,
                marginTop: "2px",
              }}
            />
            {i < versions.length - 1 && (
              <div style={{ width: "2px", flex: 1, background: "var(--border)", minHeight: "28px", margin: "2px 0" }} />
            )}
          </div>
          {/* Content */}
          <div style={{ paddingBottom: i < versions.length - 1 ? "12px" : "0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: i === 0 ? 700 : 600, color: i === 0 ? "var(--ink)" : "var(--ink-medium)" }}>
                {v.version}
              </span>
              {i === 0 && (
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--blue)", background: "var(--blue-wash)", padding: "1px 7px", borderRadius: "var(--radius-full)" }}>
                  LATEST
                </span>
              )}
              {v.breaking_changes > 0 && (
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--error)", background: "rgba(239,68,68,0.08)", padding: "1px 7px", borderRadius: "var(--radius-full)" }}>
                  {v.breaking_changes} breaking
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.73rem", color: "var(--ink-light)" }}>{fmtDate(v.released_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const ProviderDashboard: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Provider | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/providers").catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        setProviders(data.providers || MOCK_PROVIDERS);
      } else {
        setProviders(MOCK_PROVIDERS);
      }
    } catch {
      setProviders(MOCK_PROVIDERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected && providers.length > 0) setSelected(providers[0]);
  }, [providers, selected]);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const hasUpdate = (p: Provider) => p.current_version !== p.latest_version;

  return (
    <div style={{ maxWidth: "1500px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div className="section-eyebrow" style={{ marginBottom: "0.4rem" }}>External APIs</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--ink)" }}>
            Provider Dashboard
          </h1>
          <p style={{ color: "var(--ink-light)", fontSize: "0.875rem", marginTop: "4px" }}>
            Monitor health, versioning, and webhook activity for all tracked external APIs
          </p>
        </div>
        <button className="btn-secondary" onClick={load} style={{ gap: "6px" }}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem", color: "var(--ink-light)" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.5rem", alignItems: "start" }}>
          {/* Provider grid */}
          <div>
            {/* Summary KPIs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              {[
                {
                  label: "Total Providers",
                  value: providers.length,
                  icon: Boxes,
                  color: "var(--blue)",
                },
                {
                  label: "Healthy",
                  value: providers.filter((p) => p.health === "healthy").length,
                  icon: CheckCircle2,
                  color: "var(--success)",
                },
                {
                  label: "Updates Available",
                  value: providers.filter(hasUpdate).length,
                  icon: TrendingUp,
                  color: "var(--warning)",
                },
                {
                  label: "Webhooks Active",
                  value: providers.filter((p) => p.webhook_active).length,
                  icon: Zap,
                  color: "var(--blue)",
                },
              ].map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="card" style={{ padding: "1rem 1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--ink-light)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {kpi.label}
                      </span>
                      <div style={{ padding: "5px", borderRadius: "var(--radius-md)", background: "var(--blue-wash)", color: kpi.color }}>
                        <Icon size={14} />
                      </div>
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--ink)" }}>
                      {kpi.value}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Provider cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="card card-interactive"
                  onClick={() => setSelected(p)}
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderColor: selected?.id === p.id ? "var(--blue)" : "var(--border)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <HealthPulse health={p.health} />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>{p.name}</span>
                          {healthPill(p.health)}
                          {hasUpdate(p) && (
                            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--warning)", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>
                              Update: {p.latest_version}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--ink-light)", marginTop: "3px" }}>
                          Pinned to {p.current_version} · {p.usages_count} usages · {p.repos_affected} repo{p.repos_affected !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.6875rem", color: p.webhook_active ? "var(--success)" : "var(--error)" }}>
                        <Activity size={12} />
                        {p.webhook_active ? "Webhook on" : "Webhook off"}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--ink-light)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={11} />
                        {fmtTime(p.last_checked)}
                      </div>
                      <ChevronRight size={14} color="var(--ink-light)" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "76px" }}>
              {/* Provider meta */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <HealthPulse health={selected.health} />
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)" }}>{selected.name}</h2>
                  </div>
                  {healthPill(selected.health)}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1rem" }}>
                  {[
                    { label: "Pinned version", value: selected.current_version },
                    { label: "Latest version", value: selected.latest_version },
                    { label: "Usages indexed", value: `${selected.usages_count}` },
                    { label: "Repos affected", value: `${selected.repos_affected}` },
                    { label: "Webhook", value: selected.webhook_active ? "Active" : "Inactive" },
                    { label: "Last polled", value: fmtTime(selected.last_checked) },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--ink-light)", fontWeight: 500 }}>{row.label}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--ink-medium)", fontWeight: 700 }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={`https://apis.guru/${selected.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ display: "inline-flex", textDecoration: "none", fontSize: "0.8125rem", width: "100%", justifyContent: "center" }}
                >
                  <ExternalLink size={13} />
                  View on APIs.guru
                </a>
              </div>

              {/* Version timeline */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "7px" }}>
                  <TrendingUp size={14} color="var(--blue)" />
                  Version History
                </h3>
                <VersionTimeline versions={selected.version_history} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;

