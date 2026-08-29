import React, { useEffect, useState } from "react";
import { Boxes, Search, Code2, MapPin, CheckCircle } from "lucide-react";
import { fetchUsages, fetchProviders, fetchRepositories } from "../api/client";

export const Inventory: React.FC = () => {
  const [usages, setUsages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchUsages();
        setUsages(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredUsages = usages.filter((u) => {
    const matchesSearch = 
      (u.file_path || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.endpoint || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.symbol || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.snippet || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === "all" || u.usage_type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-cyan)", marginBottom: "4px" }}>
            <Boxes size={18} />
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Codebase Intelligence
            </span>
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>API Inventory</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Every external API endpoint, SDK dependency, config URL, and symbol indexed across repositories.
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search file, endpoint, symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "8px 12px 8px 36px",
                color: "#ffffff",
                fontSize: "0.85rem",
                width: "260px",
                outline: "none",
              }}
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#ffffff",
              fontSize: "0.85rem",
              outline: "none",
            }}
          >
            <option value="all">All Usage Types</option>
            <option value="endpoint_call">Endpoint Calls</option>
            <option value="client_method_call">Client Calls</option>
            <option value="base_url_config">Base URLs</option>
            <option value="sdk_dependency">Dependencies</option>
            <option value="type_reference">Type References</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
              <th style={{ padding: "14px 20px" }}>Provider</th>
              <th style={{ padding: "14px 20px" }}>Endpoint / Symbol</th>
              <th style={{ padding: "14px 20px" }}>Usage Type</th>
              <th style={{ padding: "14px 20px" }}>File & Line</th>
              <th style={{ padding: "14px 20px" }}>Code Snippet</th>
              <th style={{ padding: "14px 20px" }}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading API inventory from Neon Lakebase Postgres...
                </td>
              </tr>
            ) : filteredUsages.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                  No API usages found matching your query.
                </td>
              </tr>
            ) : (
              filteredUsages.map((u, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", transition: "background 0.15s ease" }}>
                  <td style={{ padding: "14px 20px", fontWeight: 700, color: "var(--accent-cyan)" }}>
                    {u.provider}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {u.endpoint || u.symbol || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>
                      {u.usage_type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                      <MapPin size={13} color="var(--accent-indigo)" />
                      <span>{u.file_path}:{u.line_number || 1}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", maxWidth: "340px" }}>
                    <div style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.78rem",
                      background: "rgba(0, 0, 0, 0.35)",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#93c5fd",
                    }}>
                      {u.snippet || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle size={14} color="#34d399" />
                      <span style={{ fontWeight: 600, color: "#34d399" }}>{Math.round(u.confidence * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
