import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  FileCode2,
  Calendar,
} from "lucide-react";
import { fetchMigrationHistory } from "../api/client";

interface MigrationRow {
  id: string;
  repository_id: string;
  provider: string;
  status: string;
  confidence: number;
  risk_level: string;
  is_deterministic: boolean;
  pr_url?: string;
  created_at: string;
}

interface MigrationHistoryProps {
  onNavigate?: (tab: string) => void;
}

export const MigrationHistory: React.FC<MigrationHistoryProps> = ({ onNavigate }) => {
  const [migrations, setMigrations] = useState<MigrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"created_at" | "confidence">("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const loadMigrations = useCallback(async () => {
    try {
      const data = await fetchMigrationHistory();
      if (Array.isArray(data)) {
        setMigrations(data);
      }
    } catch (err) {
      console.error("Failed to load migration history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMigrations();
    const interval = setInterval(loadMigrations, 30000);
    return () => clearInterval(interval);
  }, [loadMigrations]);

  // Filter & sort
  const filteredRows = useMemo(() => {
    return migrations
      .filter((m) => {
        if (providerFilter !== "all" && m.provider.toLowerCase() !== providerFilter.toLowerCase()) {
          return false;
        }
        if (statusFilter !== "all" && m.status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchId = m.id.toLowerCase().includes(q);
          const matchRepo = m.repository_id.toLowerCase().includes(q);
          const matchProv = m.provider.toLowerCase().includes(q);
          if (!matchId && !matchRepo && !matchProv) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === "created_at") {
          const tA = new Date(a.created_at).getTime();
          const tB = new Date(b.created_at).getTime();
          return sortAsc ? tA - tB : tB - tA;
        } else {
          return sortAsc ? a.confidence - b.confidence : b.confidence - a.confidence;
        }
      });
  }, [migrations, search, providerFilter, statusFilter, sortField, sortAsc]);

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;
    const headers = ["Migration ID", "Repository", "Provider", "Status", "Confidence", "Risk Level", "Strategy", "PR URL", "Timestamp"];
    const rows = filteredRows.map((m) => [
      m.id,
      m.repository_id,
      m.provider,
      m.status,
      `${Math.round(m.confidence * 100)}%`,
      m.risk_level,
      m.is_deterministic ? "Deterministic Recipe" : "LLM Generated",
      m.pr_url || "N/A",
      m.created_at,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `migrations-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container" style={{ padding: "2rem", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div className="section-eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={14} color="var(--blue)" />
            <span>Audit Trail & Historical Execution</span>
          </div>
          <h1 style={{ margin: "4px 0 8px 0", fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)" }}>
            Migration History
          </h1>
          <p style={{ color: "var(--ink-light)", margin: 0, fontSize: "0.875rem" }}>
            Comprehensive log of all executed migrations, validation passes, deterministic transformations, and GitHub draft PRs.
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={handleExportCSV}
          disabled={filteredRows.length === 0}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={15} style={{ position: "absolute", left: "10px", top: "11px", color: "var(--ink-light)" }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by ID, repo, or provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "32px", width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={14} color="var(--ink-light)" />
          <select
            className="input-field"
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            style={{ fontSize: "0.8125rem", padding: "6px 10px" }}
          >
            <option value="all">All Providers</option>
            <option value="fakepay">FakePay</option>
            <option value="stripe">Stripe</option>
          </select>

          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: "0.8125rem", padding: "6px 10px" }}
          >
            <option value="all">All Statuses</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="validating">Validating</option>
          </select>

          <button
            className="btn-secondary"
            onClick={() => {
              if (sortField === "created_at") {
                setSortAsc(!sortAsc);
              } else {
                setSortField("created_at");
                setSortAsc(false);
              }
            }}
            style={{ fontSize: "0.8125rem", padding: "6px 10px" }}
          >
            Date {sortField === "created_at" ? (sortAsc ? "↑" : "↓") : ""}
          </button>

          <button
            className="btn-secondary"
            onClick={() => {
              if (sortField === "confidence") {
                setSortAsc(!sortAsc);
              } else {
                setSortField("confidence");
                setSortAsc(false);
              }
            }}
            style={{ fontSize: "0.8125rem", padding: "6px 10px" }}
          >
            Confidence {sortField === "confidence" ? (sortAsc ? "↑" : "↓") : ""}
          </button>
        </div>
      </div>

      {/* Migration Table */}
      <div className="glass-panel" style={{ overflow: "hidden", border: "1px solid var(--border)" }}>
        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--ink-light)" }}>
            <Loader2 className="animate-spin" size={28} style={{ margin: "0 auto 12px auto", color: "var(--blue)" }} />
            <p style={{ margin: 0 }}>Loading migration records from Neon Postgres...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--ink-light)" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No migrations found matching your filter criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--frost)", borderBottom: "1px solid var(--border)", fontSize: "0.75rem", color: "var(--ink-light)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "12px 16px", width: "32px" }}></th>
                  <th style={{ padding: "12px 16px" }}>Timestamp</th>
                  <th style={{ padding: "12px 16px" }}>Migration ID</th>
                  <th style={{ padding: "12px 16px" }}>Provider</th>
                  <th style={{ padding: "12px 16px" }}>Repository</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px" }}>Confidence</th>
                  <th style={{ padding: "12px 16px" }}>Risk</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "0.875rem" }}>
                {filteredRows.map((row) => {
                  const isExpanded = expandedId === row.id;
                  const isPassed = row.status.toLowerCase() === "passed";
                  const confidencePct = Math.round(row.confidence * 100);

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                          background: isExpanded ? "var(--blue-wash-strong)" : "transparent",
                          transition: "background var(--transition-fast)",
                        }}
                      >
                        <td style={{ padding: "12px 16px", color: "var(--ink-light)" }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--ink-medium)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Calendar size={13} color="var(--ink-light)" />
                            {new Date(row.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink)" }}>
                          {row.id}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className="badge badge-info" style={{ textTransform: "capitalize" }}>
                            {row.provider}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--ink-medium)" }}>
                          {row.repository_id}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={`badge ${isPassed ? "badge-success" : "badge-danger"}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            {isPassed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {row.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "40px", height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${confidencePct}%`,
                                  height: "100%",
                                  background: confidencePct >= 90 ? "var(--success)" : "var(--warning)",
                                }}
                              />
                            </div>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 700 }}>
                              {confidencePct}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            className="badge"
                            style={{
                              background: row.risk_level === "critical" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                              color: row.risk_level === "critical" ? "var(--danger)" : "var(--warning)",
                              textTransform: "capitalize",
                            }}
                          >
                            {row.risk_level}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                            {row.pr_url && (
                              <a
                                href={row.pr_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              >
                                <GitPullRequest size={13} color="var(--blue)" />
                                <span>PR</span>
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail card */}
                      {isExpanded && (
                        <tr style={{ background: "var(--frost)", borderBottom: "1px solid var(--border)" }}>
                          <td colSpan={9} style={{ padding: "1rem 1.5rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                              <div style={{ background: "var(--white)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-light)", textTransform: "uppercase", marginBottom: "6px" }}>
                                  Transformation Strategy
                                </div>
                                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Shield size={16} color="var(--success)" />
                                  <span>{row.is_deterministic ? "Deterministic AST Recipe" : "LLM Bounded Synthesis"}</span>
                                </div>
                                <p style={{ fontSize: "0.78rem", color: "var(--ink-light)", margin: "4px 0 0 0" }}>
                                  Validated in disposable Docker sandbox against contract assertions.
                                </p>
                              </div>

                              <div style={{ background: "var(--white)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-light)", textTransform: "uppercase", marginBottom: "6px" }}>
                                  Repository Scope
                                </div>
                                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <FileCode2 size={16} color="var(--blue)" />
                                  <span>{row.repository_id}</span>
                                </div>
                                <p style={{ fontSize: "0.78rem", color: "var(--ink-light)", margin: "4px 0 0 0" }}>
                                  AST tree-sitter scanned and patched.
                                </p>
                              </div>

                              <div style={{ background: "var(--white)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                <div>
                                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-light)", textTransform: "uppercase", marginBottom: "6px" }}>
                                    Deep Dive Validation
                                  </div>
                                  <div style={{ fontSize: "0.8125rem", color: "var(--ink-medium)" }}>
                                    Inspect build output, sandbox logs, and AST diffs.
                                  </div>
                                </div>
                                {onNavigate && (
                                  <button
                                    className="btn-primary"
                                    onClick={() => onNavigate("validation-details")}
                                    style={{ marginTop: "10px", padding: "6px 12px", fontSize: "0.78rem", width: "fit-content" }}
                                  >
                                    View Validation Logs →
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

