import { useEffect, useState, useCallback } from "react";
import {
  FolderGit2,
  Plus,
  RefreshCw,
  ExternalLink,
  Code2,
  Search,
  Key,
  Check,
  AlertCircle,
  Trash2,
  Lock,
  Unlock,
  Star,
  GitBranch,
} from "lucide-react";
import {
  fetchConnectedRepositories,
  fetchGitHubRepositories,
  connectRepository,
  triggerRepositoryScan,
  disconnectRepository,
  fetchSession,
  fetchGitHubAuthorizeUrl,
  connectGitHub,
  disconnectGitHub,
} from "../api/client";

export const Repositories = () => {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // GitHub Repos Discovery
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [isLiveRepos, setIsLiveRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [importTab, setImportTab] = useState<"browse" | "manual">("browse");

  // Manual connect fields
  const [manualRepo, setManualRepo] = useState("");
  const [manualBranch, setManualBranch] = useState("main");
  const [manualLanguage, setManualLanguage] = useState("TypeScript");

  // Auth Modal state
  const [tokenInput, setTokenInput] = useState("");
  const [tokenConnecting, setTokenConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [connected, sess, githubData] = await Promise.all([
        fetchConnectedRepositories().catch(() => []),
        fetchSession().catch(() => null),
        fetchGitHubRepositories().catch(() => ({ repositories: [], is_live: false })),
      ]);
      setRepos(connected || []);
      setSession(sess);
      setAvailableRepos(githubData.repositories || []);
      setIsLiveRepos(Boolean(githubData.is_live));
    } catch (err) {
      console.error("Failed to load repositories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle live search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const res = await fetchGitHubRepositories(searchQuery.trim());
      setAvailableRepos(res.repositories || []);
      setIsLiveRepos(Boolean(res.is_live));
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleScan = async (repoId: string) => {
    setScanningId(repoId);
    try {
      await triggerRepositoryScan(repoId);
      await loadData();
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setScanningId(null);
    }
  };

  const handleDisconnectRepo = async (repoId: string) => {
    if (!window.confirm("Are you sure you want to disconnect this repository from monitoring?")) return;
    try {
      await disconnectRepository(repoId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectSelected = async () => {
    if (!selectedRepo) return;
    try {
      await connectRepository(
        selectedRepo.full_name,
        selectedRepo.name,
        selectedRepo.default_branch || "main",
        selectedRepo.language || "TypeScript"
      );
      setShowAddModal(false);
      setSelectedRepo(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectManual = async () => {
    if (!manualRepo.trim()) return;
    try {
      await connectRepository(manualRepo.trim(), undefined, manualBranch, manualLanguage);
      setShowAddModal(false);
      setManualRepo("");
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectToken = async () => {
    if (!tokenInput.trim()) return;
    setTokenConnecting(true);
    setAuthError(null);
    try {
      const res = await connectGitHub(tokenInput.trim());
      if (res.status === "connected") {
        setAuthSuccess(`Connected as ${res.account_login}`);
        setTimeout(() => {
          setShowAuthModal(false);
          setTokenInput("");
          setAuthSuccess(null);
          loadData();
        }, 1200);
      } else {
        setAuthError(res.detail || "Authentication failed with GitHub API.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to connect to GitHub");
    } finally {
      setTokenConnecting(false);
    }
  };

  const handleOAuthConnect = async () => {
    try {
      const data = await fetchGitHubAuthorizeUrl();
      if (data.type === "oauth" && data.url) {
        // Open OAuth popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          data.url,
          "github_oauth",
          `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
        );

        // Listen for completion postMessage
        const listener = (event: MessageEvent) => {
          if (event.data && event.data.type === "GITHUB_AUTH_SUCCESS") {
            window.removeEventListener("message", listener);
            setShowAuthModal(false);
            loadData();
          }
        };
        window.addEventListener("message", listener);

        // Fallback polling if popup closes
        const timer = setInterval(() => {
          if (popup && popup.closed) {
            clearInterval(timer);
            window.removeEventListener("message", listener);
            loadData();
          }
        }, 1000);
      } else {
        setAuthError("GitHub OAuth App credentials (GITHUB_CLIENT_ID) not yet configured. Use Personal Access Token below.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Could not initialize OAuth");
    }
  };

  const handleDisconnectGitHubAccount = async () => {
    if (!window.confirm("Disconnect GitHub account? Existing repository data will be kept.")) return;
    try {
      await disconnectGitHub();
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const githubConnected = session?.github?.connected;
  const githubUser = session?.github?.account_login;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="section-eyebrow" style={{ marginBottom: "4px" }}>
            <FolderGit2 size={16} />
            Codebase Management
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "var(--ink)" }}>
            Connected Repositories
          </h1>
          <p style={{ color: "var(--ink-light)", fontSize: "0.875rem", marginTop: "4px" }}>
            Codebases ingested from GitHub with continuous Tree-sitter AST tracking, breaking change impact analysis, and gated migrations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="btn-secondary"
            onClick={() => setShowAuthModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Key size={14} />
            <span>{githubConnected ? `GitHub: ${githubUser}` : "Connect GitHub"}</span>
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>Import Repository</span>
          </button>
        </div>
      </div>

      {/* GitHub Account Status Banner */}
      <div
        className="card"
        style={{
          padding: "1rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: githubConnected ? "var(--white)" : "var(--frost)",
          border: `1px solid ${githubConnected ? "var(--border)" : "var(--blue-wash-strong)"}`,
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {session?.user?.avatar_url ? (
            <img
              src={session.user.avatar_url}
              alt="Avatar"
              style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--border)" }}
            />
          ) : (
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--ink)",
                color: "var(--white)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              GH
            </div>
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)" }}>
                {githubConnected ? (
                  <>Connected to GitHub as <strong>{githubUser}</strong></>
                ) : (
                  "GitHub Account Not Connected"
                )}
              </span>
              <span className={`badge ${githubConnected ? "badge-success" : "badge-neutral"}`}>
                {githubConnected ? "Authenticated" : "Sandbox / Offline Mode"}
              </span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-light)", marginTop: "2px" }}>
              {githubConnected
                ? "Live GitHub OAuth & PAT active. Remote repositories and pull requests enabled."
                : "Connect your GitHub account or Personal Access Token to search, clone, and perform real-life AST scans on any codebase."}
            </div>
          </div>
        </div>

        <div>
          {githubConnected ? (
            <button
              className="btn-ghost"
              onClick={handleDisconnectGitHubAccount}
              style={{ fontSize: "0.78rem", color: "var(--error)" }}
            >
              Disconnect Account
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => setShowAuthModal(true)} style={{ fontSize: "0.8125rem" }}>
              Connect GitHub Account
            </button>
          )}
        </div>
      </div>

      {/* Repositories Grid */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {loading ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--ink-light)" }}>
            Loading repositories from Neon Postgres...
          </div>
        ) : repos.length === 0 ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
            <FolderGit2 size={36} color="var(--ink-light)" style={{ margin: "0 auto 1rem auto" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "var(--ink)" }}>
              No Repositories Connected Yet
            </h3>
            <p style={{ color: "var(--ink-light)", fontSize: "0.875rem", maxWidth: "460px", margin: "0 auto 1.5rem auto" }}>
              Import a repository from your GitHub account or connect any public repository to begin AST indexing and autonomous maintenance.
            </p>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              <span>Import First Repository</span>
            </button>
          </div>
        ) : (
          repos.map((r) => {
            const isScanning = scanningId === r.id;
            return (
              <div key={r.id} className="card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        background: "var(--blue-wash)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--blue)",
                        flexShrink: 0,
                      }}
                    >
                      <Code2 size={22} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "var(--font-mono)", margin: 0, color: "var(--ink)" }}>
                          {r.github_repo}
                        </h3>
                        <span className="badge badge-success">Monitored</span>
                        <span className="badge badge-info" style={{ fontSize: "0.6875rem" }}>
                          {r.language}
                        </span>
                        {r.status === "scanning" && (
                          <span className="badge badge-warning" style={{ fontSize: "0.6875rem" }}>
                            Scanning AST...
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "6px", fontSize: "0.8125rem", color: "var(--ink-light)", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <GitBranch size={13} />
                          Branch: <strong style={{ color: "var(--ink-medium)" }}>{r.default_branch}</strong>
                        </span>
                        <span style={{ color: "var(--gray-300)" }}>&middot;</span>
                        <span>
                          Usages Discovered: <strong style={{ color: "var(--success)" }}>{r.usages_count}</strong>
                        </span>
                        <span style={{ color: "var(--gray-300)" }}>&middot;</span>
                        <span>
                          Last AST Scan: {r.last_scanned_at ? new Date(r.last_scanned_at).toLocaleString() : "Never"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      className="btn-secondary"
                      onClick={() => handleScan(r.id)}
                      disabled={isScanning}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <RefreshCw size={14} className={isScanning ? "animate-spin" : ""} />
                      <span>{isScanning ? "Scanning AST..." : "Scan AST"}</span>
                    </button>
                    <a
                      href={`https://github.com/${r.github_repo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                      style={{ textDecoration: "none", padding: "8px 10px" }}
                      title="View on GitHub"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      className="btn-ghost"
                      onClick={() => handleDisconnectRepo(r.id)}
                      style={{ padding: "8px", color: "var(--error)" }}
                      title="Disconnect repository"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* GitHub Authentication Modal */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="card modal-content" style={{ width: "100%", maxWidth: "520px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--ink)" }}>
                  Connect GitHub Account
                </h3>
                <p style={{ color: "var(--ink-light)", fontSize: "0.85rem", marginTop: "4px" }}>
                  Authorize access to retrieve repositories, run real-time AST scans, and publish gated Draft PRs.
                </p>
              </div>
            </div>

            {authError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  fontSize: "0.8125rem",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#047857",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  fontSize: "0.8125rem",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Check size={16} />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Option 1: GitHub OAuth */}
            <div
              style={{
                background: "var(--frost)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)", marginBottom: "4px" }}>
                Option 1: One-Click GitHub OAuth
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--ink-light)", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
                Authenticate directly with GitHub in an isolated OAuth popup window.
              </p>
              <button
                className="btn-primary"
                onClick={handleOAuthConnect}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Authorize with GitHub OAuth
              </button>
            </div>

            {/* Option 2: Personal Access Token */}
            <div
              style={{
                background: "var(--frost)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)", marginBottom: "4px" }}>
                Option 2: Personal Access Token (PAT)
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--ink-light)", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
                Generate a classic token or fine-grained token with <code>repo</code> scope on GitHub.
              </p>
              <input
                type="password"
                className="input-field"
                placeholder="ghp_••••••••••••••••••••••••••••••••"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={{ marginBottom: "10px", width: "100%" }}
              />
              <button
                className="btn-secondary"
                onClick={handleConnectToken}
                disabled={!tokenInput.trim() || tokenConnecting}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {tokenConnecting ? "Validating with GitHub API..." : "Verify & Save Token"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button className="btn-secondary" onClick={() => setShowAuthModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Import Repository Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="card modal-content" style={{ width: "100%", maxWidth: "620px", padding: "2rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--ink)" }}>
              Import GitHub Repository
            </h3>
            <p style={{ color: "var(--ink-light)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Connect a codebase to begin continuous AST parsing, API contract mapping, and gated migration patches.
            </p>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border)", marginBottom: "1.25rem", paddingBottom: "6px" }}>
              <button
                onClick={() => setImportTab("browse")}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: importTab === "browse" ? "2px solid var(--blue)" : "2px solid transparent",
                  padding: "6px 12px",
                  fontWeight: importTab === "browse" ? 700 : 500,
                  color: importTab === "browse" ? "var(--ink)" : "var(--ink-light)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Browse & Search GitHub
              </button>
              <button
                onClick={() => setImportTab("manual")}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: importTab === "manual" ? "2px solid var(--blue)" : "2px solid transparent",
                  padding: "6px 12px",
                  fontWeight: importTab === "manual" ? 700 : 500,
                  color: importTab === "manual" ? "var(--ink)" : "var(--ink-light)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Enter Repository URL / Slug
              </button>
            </div>

            {importTab === "browse" ? (
              <div>
                {/* Search input */}
                <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search size={15} style={{ position: "absolute", left: "10px", top: "11px", color: "var(--ink-light)" }} />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Search repositories on GitHub (e.g. checkout, payment, demo)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: "32px", width: "100%" }}
                    />
                  </div>
                  <button type="submit" className="btn-secondary" disabled={searching}>
                    {searching ? "Searching..." : "Search"}
                  </button>
                </form>

                <div style={{ fontSize: "0.78rem", color: "var(--ink-light)", marginBottom: "8px" }}>
                  {isLiveRepos
                    ? "Live repositories retrieved from GitHub API:"
                    : "Available repositories (connect GitHub for full organization listing):"}
                </div>

                {/* Repo List */}
                <div style={{ display: "grid", gap: "8px", maxHeight: "280px", overflowY: "auto", marginBottom: "1.25rem", paddingRight: "4px" }}>
                  {availableRepos.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--ink-light)", fontSize: "0.85rem" }}>
                      No repositories found matching your query.
                    </div>
                  ) : (
                    availableRepos.map((ar) => {
                      const isSelected = selectedRepo?.full_name === ar.full_name;
                      return (
                        <div
                          key={ar.full_name}
                          onClick={() => setSelectedRepo(ar)}
                          style={{
                            background: isSelected ? "var(--blue-wash-strong)" : "var(--frost)",
                            border: isSelected ? "1px solid var(--blue)" : "1px solid var(--border)",
                            borderRadius: "var(--radius-md)",
                            padding: "10px 14px",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                              {ar.is_private ? <Lock size={12} color="var(--warning)" /> : <Unlock size={12} color="var(--ink-light)" />}
                              <span>{ar.full_name}</span>
                            </div>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              {ar.stargazers_count ? (
                                <span style={{ fontSize: "0.75rem", color: "var(--ink-light)", display: "flex", alignItems: "center", gap: "2px" }}>
                                  <Star size={11} /> {ar.stargazers_count}
                                </span>
                              ) : null}
                              <span className="badge badge-info" style={{ fontSize: "0.6875rem" }}>
                                {ar.language || "TypeScript"}
                              </span>
                            </div>
                          </div>
                          {ar.description && (
                            <div style={{ fontSize: "0.78rem", color: "var(--ink-light)", marginTop: "4px" }}>
                              {ar.description}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleConnectSelected} disabled={!selectedRepo}>
                    Import & Connect Selected
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink)", marginBottom: "4px" }}>
                    GitHub Repository (owner/repo)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. rizzzabh-06/fakepay-nextjs-demo or your-org/checkout-api"
                    value={manualRepo}
                    onChange={(e) => setManualRepo(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink)", marginBottom: "4px" }}>
                      Default Branch
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={manualBranch}
                      onChange={(e) => setManualBranch(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink)", marginBottom: "4px" }}>
                      Primary Language
                    </label>
                    <select
                      className="input-field"
                      value={manualLanguage}
                      onChange={(e) => setManualLanguage(e.target.value)}
                      style={{ width: "100%", height: "38px" }}
                    >
                      <option value="TypeScript">TypeScript</option>
                      <option value="JavaScript">JavaScript</option>
                      <option value="Python">Python</option>
                      <option value="Go">Go</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleConnectManual} disabled={!manualRepo.trim()}>
                    Import & Ingest Codebase
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
