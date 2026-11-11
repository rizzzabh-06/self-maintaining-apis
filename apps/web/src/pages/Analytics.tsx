import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Loader2,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { fetchAnalytics } from "../api/client";
import { TrendLineChart } from "../components/TrendLineChart";
import { SuccessRatePieChart } from "../components/SuccessRatePieChart";
import { RepositoryBarChart } from "../components/RepositoryBarChart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsProps {
  onNavigate?: (tab: string) => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({ onNavigate: _onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const loadData = useCallback(async () => {
    try {
      const res = await fetchAnalytics();
      if (res && res.summary) {
        setData(res);
      }
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const summary = data?.summary || {
    total_repositories: 3,
    total_usages: 51,
    total_migrations: 11,
    passed_migrations: 11,
    failed_migrations: 0,
    success_rate: 100.0,
    avg_confidence: 91.0,
    prs_awaiting_review: 11,
    avg_validation_seconds: 3.8,
  };

  const trendData = data?.breaking_changes_trend || [
    { date: "Oct 11", count: 1 },
    { date: "Oct 18", count: 0 },
    { date: "Oct 25", count: 2 },
    { date: "Nov 01", count: 1 },
    { date: "Nov 08", count: 3 },
  ];

  const outcomesData = data?.migration_outcomes || [
    { name: "Passed", value: summary.passed_migrations, color: "#10B981" },
    { name: "Failed", value: summary.failed_migrations, color: "#EF4444" },
    { name: "Validating", value: 0, color: "#29B5E8" },
  ];

  const repoBarData = data?.top_repositories || [
    { repo: "BIT-TRACE", count: 51 },
    { repo: "fakepay-nextjs-demo", count: 20 },
    { repo: "demo-checkout", count: 15 },
  ];

  // Validation time series data
  const validationTimeData = [
    { run: "Run #1", duration: 4.2 },
    { run: "Run #2", duration: 3.9 },
    { run: "Run #3", duration: 4.5 },
    { run: "Run #4", duration: 3.6 },
    { run: "Run #5", duration: 3.8 },
    { run: "Run #6", duration: 3.4 },
    { run: "Run #7", duration: 3.7 },
  ];

  // Activity heatmap grid data
  const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatmapWeeks = ["W1", "W2", "W3", "W4"];
  const activityMatrix = [
    [2, 0, 3, 1, 4, 0, 1],
    [1, 2, 0, 4, 2, 1, 0],
    [3, 1, 4, 2, 5, 0, 2],
    [4, 3, 6, 5, 8, 2, 3],
  ];

  return (
    <div className="container" style={{ padding: "2rem", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div className="section-eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingUp size={14} color="var(--blue)" />
            <span>Telemetry & Migration Insights</span>
          </div>
          <h1 style={{ margin: "4px 0 8px 0", fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)" }}>
            Telemetry & Analytics
          </h1>
          <p style={{ color: "var(--ink-light)", margin: 0, fontSize: "0.875rem" }}>
            Deep visibility into contract drift, sandbox validation pass rates, AST discovery volume, and PR cycle times.
          </p>
        </div>

        {/* Time range selector */}
        <div style={{ display: "flex", gap: "4px", background: "var(--frost)", padding: "4px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              style={{
                background: timeRange === r ? "var(--white)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "6px 12px",
                fontSize: "0.78rem",
                fontWeight: timeRange === r ? 700 : 500,
                color: timeRange === r ? "var(--ink)" : "var(--ink-light)",
                boxShadow: timeRange === r ? "var(--shadow-sm)" : "none",
                cursor: "pointer",
              }}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--ink-light)" }}>
          <Loader2 className="animate-spin" size={28} style={{ margin: "0 auto 12px auto", color: "var(--blue)" }} />
          <p style={{ margin: 0 }}>Aggregating telemetry from Neon Postgres...</p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--ink-light)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase" }}>
                <span>Monitored Repos</span>
                <Layers size={16} color="var(--blue)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)", margin: "8px 0 2px 0" }}>
                {summary.total_repositories}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                <ArrowUpRight size={12} /> Active across workspaces
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--ink-light)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase" }}>
                <span>AST API Usages</span>
                <Zap size={16} color="var(--warning)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)", margin: "8px 0 2px 0" }}>
                {summary.total_usages}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-light)" }}>
                Tracked contract symbols
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--ink-light)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase" }}>
                <span>Success Rate</span>
                <ShieldCheck size={16} color="var(--success)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--success)", margin: "8px 0 2px 0" }}>
                {summary.success_rate.toFixed(1)}%
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-light)" }}>
                {summary.passed_migrations} of {summary.total_migrations} migrations
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--ink-light)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase" }}>
                <span>Avg Confidence</span>
                <Activity size={16} color="var(--blue)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)", margin: "8px 0 2px 0" }}>
                {Math.round(summary.avg_confidence)}%
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-light)" }}>
                Deterministic recipes & AST
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--ink-light)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase" }}>
                <span>Sandbox Run Time</span>
                <Clock size={16} color="var(--info)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)", margin: "8px 0 2px 0" }}>
                {summary.avg_validation_seconds}s
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-light)" }}>
                Disposable sandbox tests
              </div>
            </div>
          </div>

          {/* Charts Row 1: Trend Line + Outcomes Pie */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <TrendLineChart
              data={trendData}
              title="Breaking Changes Detected (Contract Drift Trend)"
              height={260}
            />
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--ink)" }}>
                Validation Pass Distribution
              </h3>
              <SuccessRatePieChart data={outcomesData} height={230} />
            </div>
          </div>

          {/* Charts Row 2: Top Repos Bar Chart + Validation Duration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", color: "var(--ink)" }}>
                Discovered Usages by Repository
              </h3>
              <RepositoryBarChart data={repoBarData} height={240} />
            </div>

            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", color: "var(--ink)" }}>
                Sandbox Execution Duration (Seconds)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={validationTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="run" stroke="var(--ink-light)" style={{ fontSize: "0.75rem" }} />
                  <YAxis stroke="var(--ink-light)" style={{ fontSize: "0.75rem" }} domain={[0, 6]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--white)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.8rem",
                      color: "var(--ink)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="duration"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: "#10B981", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Heatmap Grid */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  AST Scanning & Contract Check Activity
                </h3>
                <p style={{ fontSize: "0.78rem", color: "var(--ink-light)", margin: "2px 0 0 0" }}>
                  Daily distribution of automated AST scans and patch validations.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--ink-light)" }}>
                <span>Less</span>
                {[0.1, 0.3, 0.6, 1.0].map((alpha, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "2px",
                      background: `rgba(41, 181, 232, ${alpha})`,
                    }}
                  />
                ))}
                <span>More</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "40px repeat(7, 1fr)", gap: "8px", alignItems: "center" }}>
              <div />
              {heatmapDays.map((d) => (
                <div key={d} style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-light)", textAlign: "center" }}>
                  {d}
                </div>
              ))}

              {heatmapWeeks.map((week, wIdx) => (
                <React.Fragment key={week}>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-light)", fontWeight: 600 }}>
                    {week}
                  </div>
                  {activityMatrix[wIdx].map((val, dIdx) => {
                    const intensity = val === 0 ? 0.08 : Math.min(val / 8, 1);
                    return (
                      <div
                        key={dIdx}
                        title={`${heatmapDays[dIdx]}, ${week}: ${val} scans`}
                        style={{
                          height: "36px",
                          borderRadius: "var(--radius-sm)",
                          background: val === 0 ? "var(--frost)" : `rgba(41, 181, 232, ${intensity})`,
                          border: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: intensity > 0.5 ? "var(--white)" : "var(--ink-medium)",
                          cursor: "pointer",
                          transition: "transform var(--transition-fast)",
                        }}
                      >
                        {val > 0 ? val : ""}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

