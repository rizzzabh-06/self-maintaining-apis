import { useEffect, useState, useCallback } from "react";
import { Boxes, Search, MapPin, ChevronDown, ChevronUp, Download, SlidersHorizontal } from "lucide-react";
import { fetchUsages } from "../api/client";

const LANG_MAP: Record<string, { label: string; cls: string }> = {
  ".ts": { label: "TypeScript", cls: "badge-ts" },
  ".tsx": { label: "TypeScript", cls: "badge-ts" },
  ".py": { label: "Python", cls: "badge-py" },
  ".go": { label: "Go", cls: "badge-go" },
  ".java": { label: "Java", cls: "badge-java" },
};

function getLangBadge(filePath: string) {
  for (const [ext, v] of Object.entries(LANG_MAP)) {
    if (filePath?.endsWith(ext)) return v;
  }
  return { label: "TS", cls: "badge-ts" };
}

function getConfidenceColor(v: number): string {
  if (v >= 0.9) return "#34d399";
  if (v >= 0.7) return "#fbbf24";
  return "#fb7185";
}

export const Inventory: React.FC = () => {
  const [usages, setUsages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");

  const load = useCallback(async () => {
    try {
      const data = await fetchUsages();
      setUsages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredUsages = usages.filter((u) => {
    const matchesSearch =
      (u.file_path || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.endpoint || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.symbol || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.snippet || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || u.usage_type === selectedType;
    return matchesSearch && matchesType;
  });

  // Tree view: group by file
  const treeData = filteredUsages.reduce<Record<string, any[]>>((acc, u) => {
    const key = u.file_path || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});

  function handleExportCSV() {
    const header = ["Provider", "Endpoint/Symbol", "Usage Type", "File", "Line", "Confidence"];
    const rows = filteredUsages.map((u) => [
      u.provider || "",
      u.endpoint || u.symbol || "",
      u.usage_type || "",
      u.file_path || "",
      u.line_number || "",
      Math.round((u.confidence || 0) * 100) + "%",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "api-inventory.csv";
    a.click();
  }

  return (
    <div style={{ maxWidth: "1500px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "1.75rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div className="animate-fade-up">
          <div className="section-eyebrow" style={{ color: "var(--accent-cyan)" }}>
            <Boxes size={16} />
            Codebase Intelligence
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 800, letterSpacing: "-0.03em" }}>API Inventory</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "4px" }}>
            Every external endpoint, SDK dependency, config URL, and symbol indexed across all repositories.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              color="var(--text-muted)"
              style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search file, endpoint, symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: "34px", width: "240px", fontSize: "0.82rem" }}
            />
          </div>

          {/* Type filter */}
          <div style={{ position: "relative" }}>
            <SlidersHorizontal
              size={13}
              color="var(--text-muted)"
              style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
            />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input-field"
              style={{ paddingLeft: "30px", width: "180px", fontSize: "0.82rem", appearance: "none", cursor: "pointer" }}
            >
              <option value="all">All Usage Types</option>
              <option value="endpoint_call">Endpoint Calls</option>
              <option value="client_method_call">Client Calls</option>
              <option value="base_url_config">Base URLs</option>
              <option value="sdk_dependency">Dependencies</option>
              <option value="type_reference">Type References</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            {(["table", "tree"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  padding: "7px 13px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  background: viewMode === m ? "rgba(99,102,241,0.18)" : "transparent",
                  color: viewMode === m ? "#ffffff" : "var(--text-muted)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  textTransform: "capitalize",
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <button className="btn-secondary" onClick={handleExportCSV} style={{ fontSize: "0.8rem" }}>
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem", flexWrap: "wrap" }}>
        {[
          { label: "Total Usages", value: filteredUsages.length, color: "var(--accent-cyan)" },
          { label: "Files Covered", value: Object.keys(treeData).length, color: "#818cf8" },
          { label: "Avg Confidence", value: `${Math.round((filteredUsages.reduce((s, u) => s + (u.confidence || 0), 0) / Math.max(filteredUsages.length, 1)) * 100)}%`, color: "#34d399" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "8px 14px",
              fontSize: "0.78rem",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>{s.label}: </span>
            <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <div className="glass-panel" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Endpoint / Symbol</th>
                <th>Usage Type</th>
                <th>Language</th>
                <th>File & Line</th>
                <th>Confidence</th>
                <th style={{ width: "40px" }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: "14px 18px" }}>
                        <div className="skeleton skeleton-text" style={{ width: j === 4 ? "140px" : "80px" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredUsages.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No API usages found matching your query.
                  </td>
                </tr>
              ) : (
                filteredUsages.map((u, idx) => {
                  const lang = getLangBadge(u.file_path || "");
                  const isExpanded = expandedRow === idx;
                  const conf = u.confidence || 0;
                  return (
                    <>
                      <tr
                        key={idx}
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpandedRow(isExpanded ? null : idx)}
                      >
                        <td style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{u.provider || "—"}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem" }}>
                            {u.endpoint || u.symbol || "—"}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: "0.67rem" }}>
                            {(u.usage_type || "").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${lang.cls}`} style={{ fontSize: "0.67rem" }}>
                            {lang.label}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.75rem",
                            }}
                          >
                            <MapPin size={11} color="var(--accent-indigo)" />
                            <span>
                              {u.file_path}
                              {u.line_number ? `:${u.line_number}` : ""}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div className="progress-track" style={{ width: "60px" }}>
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${conf * 100}%`,
                                  background: `linear-gradient(90deg, ${getConfidenceColor(conf)}88, ${getConfidenceColor(conf)})`,
                                  animation: "none",
                                }}
                              />
                            </div>
                            <span style={{ fontWeight: 700, color: getConfidenceColor(conf), fontSize: "0.8rem" }}>
                              {Math.round(conf * 100)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          {isExpanded ? (
                            <ChevronUp size={14} color="var(--text-muted)" />
                          ) : (
                            <ChevronDown size={14} color="var(--text-muted)" />
                          )}
                        </td>
                      </tr>
                      {isExpanded && u.snippet && (
                        <tr key={`${idx}-exp`} className="animate-fade-up">
                          <td colSpan={7} style={{ padding: "0 18px 14px" }}>
                            <div className="code-snippet-expanded">{u.snippet}</div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tree View */}
      {viewMode === "tree" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-panel skeleton" style={{ height: "80px" }} />
              ))
            : Object.entries(treeData).map(([file, items]) => {
                const lang = getLangBadge(file);
                return (
                  <div key={file} className="glass-panel animate-fade-up" style={{ overflow: "hidden" }}>
                    {/* File header */}
                    <div
                      style={{
                        padding: "1rem 1.25rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        borderBottom: "1px solid var(--border-subtle)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <span className={`badge ${lang.cls}`} style={{ fontSize: "0.65rem" }}>
                        {lang.label}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          fontSize: "0.88rem",
                        }}
                      >
                        {file}
                      </span>
                      <span
                        className="badge badge-indigo"
                        style={{ marginLeft: "auto", fontSize: "0.65rem" }}
                      >
                        {items.length} usages
                      </span>
                    </div>
                    {/* Items */}
                    {items.map((u, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "10px 1.25rem",
                          display: "flex",
                          gap: "12px",
                          alignItems: "flex-start",
                          borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                        }}
                      >
                        <span className="badge badge-info" style={{ fontSize: "0.64rem", flexShrink: 0, marginTop: "1px" }}>
                          {(u.usage_type || "").replace(/_/g, " ")}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                            {u.endpoint || u.symbol || "—"}
                          </div>
                          {u.snippet && (
                            <div
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.75rem",
                                color: "#93c5fd",
                                marginTop: "4px",
                                background: "#040810",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {u.snippet}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          L{u.line_number || 1}
                        </div>
                        <span style={{ fontWeight: 700, color: getConfidenceColor(u.confidence || 0), fontSize: "0.78rem" }}>
                          {Math.round((u.confidence || 0) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
        </div>
      )}
    </div>
  );
};
