import { useEffect, useState } from "react";
import { 
  FolderGit2, 
  Plus, 
  RefreshCw, 
  ExternalLink,
  Code2
} from "lucide-react";
import { 
  fetchConnectedRepositories, 
  fetchGitHubRepositories, 
  connectRepository, 
  triggerRepositoryScan 
} from "../api/client";

export const Repositories = () => {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");

  const loadData = async () => {
    try {
      const [connected, githubData] = await Promise.all([
        fetchConnectedRepositories(),
        fetchGitHubRepositories(),
      ]);
      setRepos(connected);
      setAvailableRepos(githubData.repositories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScan = async (repoId: string) => {
    setScanningId(repoId);
    try {
      await triggerRepositoryScan(repoId);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setScanningId(null);
    }
  };

  const handleConnect = async () => {
    if (!selectedRepo) return;
    try {
      await connectRepository(selectedRepo);
      setShowAddModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-indigo)", marginBottom: "4px" }}>
            <FolderGit2 size={18} />
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Codebase Management
            </span>
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Connected Repositories</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Codebases ingested from GitHub with active AST dependency tracking and continuous API contract maintenance.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          <span>Add GitHub Repository</span>
        </button>
      </div>

      {/* Repositories Grid */}
      <div style={{ display: "grid", gap: "1.2rem" }}>
        {loading ? (
          <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading repositories from Neon Postgres...
          </div>
        ) : (
          repos.map((r) => {
            const isScanning = scanningId === r.id;
            return (
              <div key={r.id} className="glass-panel" style={{ padding: "1.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: "rgba(99, 102, 241, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#818cf8",
                    }}>
                      <Code2 size={22} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                          {r.github_repo}
                        </h3>
                        <span className="badge badge-success">Monitored</span>
                        <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>{r.language}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        <span>Branch: <strong>{r.default_branch}</strong></span>
                        <span>•</span>
                        <span>Usages Indexed: <strong style={{ color: "#34d399" }}>{r.usages_count}</strong></span>
                        <span>•</span>
                        <span>Last Scan: {r.last_scanned_at ? new Date(r.last_scanned_at).toLocaleTimeString() : "Pending"}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                      className="btn-secondary"
                      onClick={() => handleScan(r.id)}
                      disabled={isScanning}
                    >
                      <RefreshCw size={14} className={isScanning ? "animate-spin" : ""} />
                      <span>{isScanning ? "Scanning AST..." : "Scan Now"}</span>
                    </button>
                    <a
                      href={`https://github.com/${r.github_repo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                      style={{ textDecoration: "none" }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Repository Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(5, 8, 16, 0.8)",
          backdropFilter: "blur(16px)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "550px", padding: "2rem" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.5rem" }}>
              Import GitHub Repository
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
              Select a repository accessible to your authorized GitHub App installation.
            </p>

            <div style={{ display: "grid", gap: "10px", marginBottom: "1.8rem" }}>
              {availableRepos.map((ar) => (
                <div
                  key={ar.full_name}
                  onClick={() => setSelectedRepo(ar.full_name)}
                  style={{
                    background: selectedRepo === ar.full_name ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.02)",
                    border: selectedRepo === ar.full_name ? "1px solid var(--accent-indigo)" : "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>{ar.full_name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>{ar.description}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleConnect} disabled={!selectedRepo}>Import & Connect</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
