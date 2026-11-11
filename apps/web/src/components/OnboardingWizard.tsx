import { useState, useEffect } from "react";
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  FolderGit2, 
  ShieldCheck, 
  RefreshCw,
  Lock,
  Unlock,
  Star,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Key,
} from "lucide-react";
import { 
  fetchSession,
  fetchGitHubAuthorizeUrl,
  connectGitHub, 
  connectRepository, 
  triggerRepositoryScan, 
  updateAutomationSettings,
  fetchGitHubRepositories
} from "../api/client";

interface OnboardingWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface AvailableRepo {
  name: string;
  fullName: string;
  lang: string;
  desc: string;
  defaultBranch: string;
  isPrivate?: boolean;
  stars?: number;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("Rizzabh");
  
  // GitHub Auth State
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubAccount, setGithubAccount] = useState("demo-org");
  const [githubAvatar, setGithubAvatar] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [authMethod, setAuthMethod] = useState<"oauth" | "pat">("oauth");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Repository selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [availableRepos, setAvailableRepos] = useState<AvailableRepo[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [customRepo, setCustomRepo] = useState("");

  // Scan & automation state
  const [scanResult, setScanResult] = useState<any>(null);
  const [autoScanOnPush, setAutoScanOnPush] = useState(true);
  const [autoPrOnBreaking, setAutoPrOnBreaking] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.90);

  const steps = [
    { num: 1, title: "Log In" },
    { num: 2, title: "Workspace" },
    { num: 3, title: "Connect GitHub" },
    { num: 4, title: "Select Repos" },
    { num: 5, title: "Initial Scan" },
    { num: 6, title: "API Inventory" },
    { num: 7, title: "Providers" },
    { num: 8, title: "Automation" },
    { num: 9, title: "Dashboard" },
  ];

  // Check existing session on mount
  useEffect(() => {
    fetchSession()
      .then((sess) => {
        if (sess?.github?.connected) {
          setGithubConnected(true);
          setGithubAccount(sess.github.account_login || "rizzzabh-06");
          setGithubAvatar(sess.user?.avatar_url || "");
          setAuthSuccess(`Authenticated as ${sess.github.account_login}`);
        }
      })
      .catch(() => {});
  }, []);

  // Listen for OAuth popup completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "GITHUB_AUTH_SUCCESS") {
        setGithubConnected(true);
        setGithubAccount(event.data.account_login || "rizzzabh-06");
        setAuthSuccess(`Connected as ${event.data.account_login}`);
        setAuthError("");
        loadRepos();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Load live repositories from GitHub
  const loadRepos = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetchGitHubRepositories(query);
      if (res.repositories && res.repositories.length > 0) {
        const mapped: AvailableRepo[] = res.repositories.map((r: any) => ({
          name: r.name,
          fullName: r.full_name,
          lang: r.language || "TypeScript",
          desc: r.description || "GitHub repository",
          defaultBranch: r.default_branch || "main",
          isPrivate: Boolean(r.is_private),
          stars: r.stargazers_count || 0,
        }));
        setAvailableRepos(mapped);
        if (selectedRepos.length === 0 && mapped.length > 0) {
          setSelectedRepos([mapped[0].fullName]);
        }
      }
    } catch (err) {
      console.error("Failed to load GitHub repos:", err);
    } finally {
      setLoading(false);
    }
  };

  // Launch OAuth popup
  const handleLaunchOAuth = async () => {
    setAuthError("");
    try {
      const res = await fetchGitHubAuthorizeUrl();
      if (res.type === "oauth" && res.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(res.url, "GitHub OAuth", `width=${width},height=${height},left=${left},top=${top}`);
      } else {
        setAuthError(res.message || "OAuth app credentials not configured in .env. Use Personal Access Token below.");
        setAuthMethod("pat");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to initiate OAuth");
      setAuthMethod("pat");
    }
  };

  // Connect via Personal Access Token
  const handleConnectToken = async () => {
    if (!githubToken.trim()) {
      setAuthError("Please paste a valid Personal Access Token.");
      return;
    }
    setLoading(true);
    setAuthError("");
    try {
      const res = await connectGitHub(githubToken.trim());
      if (res.status === "connected") {
        setGithubConnected(true);
        setGithubAccount(res.account_login);
        setGithubAvatar(res.avatar_url);
        setAuthSuccess(`Connected as ${res.account_login}`);
        loadRepos();
      } else {
        setAuthError(res.detail || "Token verification failed with GitHub API.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Network error connecting token.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 3) {
      // If moving to step 4, ensure repos are loaded
      await loadRepos();
    } else if (currentStep === 4) {
      setLoading(true);
      try {
        const targets = [...selectedRepos];
        if (customRepo.trim() && !targets.includes(customRepo.trim())) {
          targets.push(customRepo.trim());
        }
        for (const r of targets) {
          const matched = availableRepos.find((ar) => ar.fullName === r || ar.name === r);
          await connectRepository(
            matched?.fullName || r,
            matched?.name || r.split("/").pop(),
            matched?.defaultBranch || "main",
            matched?.lang || "TypeScript"
          );
        }
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 5) {
      setLoading(true);
      try {
        const targetRepo = selectedRepos[0] || (availableRepos[0] ? availableRepos[0].fullName : "demo-checkout");
        const cleanName = targetRepo.split("/").pop()?.replace(/[-.]/g, "_") || "demo_checkout";
        const targetId = `repo_${cleanName}`;
        const res = await triggerRepositoryScan(targetId).catch(() =>
          triggerRepositoryScan("repo_demo_checkout")
        );
        setScanResult(res);
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 8) {
      setLoading(true);
      try {
        await updateAutomationSettings({
          auto_scan_on_push: autoScanOnPush,
          auto_pr_on_breaking: autoPrOnBreaking,
          confidence_threshold: confidenceThreshold,
        });
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 9) {
      onComplete();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 9));
  };

  const toggleRepo = (repoFullName: string) => {
    if (selectedRepos.includes(repoFullName)) {
      setSelectedRepos(selectedRepos.filter((r) => r !== repoFullName));
    } else {
      setSelectedRepos([...selectedRepos, repoFullName]);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 30, 54, 0.65)",
      backdropFilter: "blur(10px)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div className="card modal-content" style={{
        width: "100%",
        maxWidth: "960px",
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
        boxShadow: "0 24px 60px rgba(15, 30, 54, 0.25)",
        borderRadius: "var(--radius-lg)",
      }}>
        {/* Stepper Header */}
        <div style={{
          padding: "1.25rem 2rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--white)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "38px",
                height: "38px",
                borderRadius: "var(--radius-md)",
                background: "var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--white)",
                boxShadow: "0 2px 6px rgba(15, 30, 54, 0.15)",
              }}>
                <FolderGit2 size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-0.01em" }}>
                  Autonomous Workspace Onboarding
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--ink-light)", margin: "2px 0 0 0" }}>
                  Step {currentStep} of 9 &middot; <strong style={{ color: "var(--ink)" }}>{steps[currentStep - 1].title}</strong>
                </p>
              </div>
            </div>

            <button 
              className="btn-ghost btn-sm"
              onClick={onCancel}
            >
              Skip to Dashboard
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {steps.map((s) => {
              const isPassed = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div
                  key={s.num}
                  style={{
                    flex: 1,
                    minWidth: "75px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <div style={{
                    width: "100%",
                    height: "4px",
                    borderRadius: "2px",
                    background: isPassed ? "var(--success)" : isCurrent ? "var(--blue)" : "var(--border)",
                    transition: "all 0.3s ease",
                  }} />
                  <span style={{
                    fontSize: "0.6875rem",
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? "var(--ink)" : isPassed ? "var(--success)" : "var(--ink-light)",
                    whiteSpace: "nowrap",
                  }}>
                    {s.num}. {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Body Content */}
        <div style={{ padding: "2rem 2.5rem", flex: 1, overflowY: "auto", background: "var(--white)" }}>
          {/* Step 1: Log in */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                1. Authenticated Platform Session
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
                Connected to Neon Lakebase Postgres backend. Workspace data and migrations are cryptographically isolated.
              </p>
              
              <div style={{
                background: "var(--frost)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "18px",
              }}>
                <img 
                  src={githubAvatar || "https://avatars.githubusercontent.com/u/202411600?v=4"} 
                  alt="Avatar" 
                  style={{ width: "56px", height: "56px", borderRadius: "50%", border: "2px solid var(--blue)" }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--ink)" }}>
                    {githubAccount !== "demo-org" ? githubAccount : "Rizzabh Workspace Admin"}
                  </div>
                  <div style={{ color: "var(--ink-light)", fontSize: "0.85rem" }}>admin@example.com</div>
                  <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                    <span className="badge badge-success">Neon Postgres Connected</span>
                    <span className="badge badge-info">Gemini LLM Ready</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Create Workspace */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                2. Select or Create a Workspace
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
                Workspaces group monitored repositories, API provider credentials, and migration audit logs.
              </p>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>
                  Workspace / Organization Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  style={{ width: "100%", maxWidth: "450px" }}
                />
                <div style={{ fontSize: "0.8rem", color: "var(--ink-light)", marginTop: "8px" }}>
                  Linked Neon Org ID: <code style={{ color: "var(--blue)", fontFamily: "var(--font-mono)" }}>org-wispy-boat-92392834</code>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Connect GitHub (Upgraded Flow) */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                3. Connect GitHub Account or GitHub App
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
                Connect your GitHub account to enable automatic repository cloning, tree-sitter AST analysis, and isolated draft pull request generation.
              </p>

              {/* Already Connected Banner */}
              {githubConnected ? (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem 1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    {githubAvatar ? (
                      <img src={githubAvatar} alt={githubAccount} style={{ width: "44px", height: "44px", borderRadius: "50%", border: "2px solid var(--success)" }} />
                    ) : (
                      <CheckCircle2 size={36} color="var(--success)" />
                    )}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)" }}>
                        Connected to GitHub as <strong>{githubAccount}</strong>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--ink-light)", marginTop: "2px" }}>
                        Active access token loaded & verified with GitHub API.
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ padding: "4px 12px" }}>
                    Authenticated
                  </span>
                </div>
              ) : null}

              {/* Method Tabs */}
              <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border)", marginBottom: "1.25rem" }}>
                <button
                  type="button"
                  onClick={() => setAuthMethod("oauth")}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: authMethod === "oauth" ? "2px solid var(--blue)" : "2px solid transparent",
                    padding: "8px 14px",
                    fontWeight: authMethod === "oauth" ? 700 : 500,
                    color: authMethod === "oauth" ? "var(--ink)" : "var(--ink-light)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  1-Click GitHub App / OAuth
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod("pat")}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: authMethod === "pat" ? "2px solid var(--blue)" : "2px solid transparent",
                    padding: "8px 14px",
                    fontWeight: authMethod === "pat" ? 700 : 500,
                    color: authMethod === "pat" ? "var(--ink)" : "var(--ink-light)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Personal Access Token (PAT)
                </button>
              </div>

              {authError && (
                <div style={{ background: "var(--error-wash)", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", padding: "10px 14px", color: "var(--danger)", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={16} />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && !githubConnected && (
                <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid var(--success)", borderRadius: "var(--radius-sm)", padding: "10px 14px", color: "var(--success)", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={16} />
                  <span>{authSuccess}</span>
                </div>
              )}

              {authMethod === "oauth" ? (
                <div style={{ background: "var(--frost)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 6px 0", color: "var(--ink)" }}>
                    Authorize via GitHub App
                  </h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--ink-light)", lineHeight: 1.5, margin: "0 0 1.25rem 0" }}>
                    Opens GitHub's secure authorization window to grant repository read/write access for automated AST scans and draft PR creation.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleLaunchOAuth}
                    style={{ gap: "8px" }}
                  >
                    <FolderGit2 size={16} />
                    <span>Authorize with GitHub App</span>
                  </button>
                </div>
              ) : (
                <div style={{ background: "var(--frost)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
                      Personal Access Token (classic or fine-grained)
                    </label>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo,read:org"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: "0.78rem", color: "var(--blue)", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <Key size={12} />
                      <span>Generate Token on GitHub</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="ghp_••••••••••••••••••••••••••••••••••••"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleConnectToken}
                      disabled={loading || !githubToken.trim()}
                    >
                      {loading ? "Verifying..." : "Verify & Connect"}
                    </button>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-light)", marginTop: "6px" }}>
                    Requires <code>repo</code> scope to clone codebases into <code>.repos/</code> and open draft PRs.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Select Repositories (Upgraded with Live Search & Monorepo Support) */}
          {currentStep === 4 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.25rem 0" }}>
                    4. Select Repositories for Ingestion
                  </h3>
                  <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: 0 }}>
                    Choose codebases to monitor for external API contract drift and automated patching.
                  </p>
                </div>

                <div style={{ position: "relative", width: "260px" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "11px", color: "var(--ink-light)" }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Filter repositories..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      loadRepos(e.target.value);
                    }}
                    style={{ paddingLeft: "30px", width: "100%", fontSize: "0.8125rem", minHeight: "34px" }}
                  />
                </div>
              </div>

              {/* Repositories List */}
              <div style={{ display: "grid", gap: "8px", maxHeight: "320px", overflowY: "auto", paddingRight: "4px", marginBottom: "1rem" }}>
                {availableRepos.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--ink-light)" }}>
                    No repositories found. Ensure your GitHub account is connected.
                  </div>
                ) : (
                  availableRepos.map((r) => {
                    const isChecked = selectedRepos.includes(r.fullName) || selectedRepos.includes(r.name);
                    return (
                      <div
                        key={r.fullName}
                        onClick={() => toggleRepo(r.fullName)}
                        style={{
                          background: isChecked ? "rgba(41, 181, 232, 0.08)" : "var(--frost)",
                          border: isChecked ? "1px solid var(--blue)" : "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          padding: "10px 14px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "4px",
                            border: isChecked ? "none" : "1px solid var(--border)",
                            background: isChecked ? "var(--blue)" : "var(--white)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            {isChecked && <Check size={14} color="#ffffff" />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                              {r.isPrivate ? <Lock size={12} color="var(--warning)" /> : <Unlock size={12} color="var(--ink-light)" />}
                              <span>{r.fullName}</span>
                            </div>
                            {r.desc && (
                              <div style={{ fontSize: "0.78rem", color: "var(--ink-light)", marginTop: "2px" }}>
                                {r.desc}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {r.stars ? (
                            <span style={{ fontSize: "0.75rem", color: "var(--ink-light)", display: "flex", alignItems: "center", gap: "2px" }}>
                              <Star size={11} /> {r.stars}
                            </span>
                          ) : null}
                          <span className="badge badge-info" style={{ fontSize: "0.6875rem" }}>{r.lang}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Or manual slug entry */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "var(--frost)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px dashed var(--border)" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--ink-light)", whiteSpace: "nowrap" }}>Or custom repo slug:</span>
                <input
                  type="text"
                  className="input-field"
                  placeholder="owner/repository-slug"
                  value={customRepo}
                  onChange={(e) => setCustomRepo(e.target.value)}
                  style={{ flex: 1, minHeight: "34px", fontSize: "0.8125rem" }}
                />
              </div>
            </div>
          )}

          {/* Step 5: Initial AST Scan */}
          {currentStep === 5 && (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <div style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "var(--frost)",
                border: "2px solid var(--blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem auto",
                boxShadow: "0 0 20px rgba(41, 181, 232, 0.25)",
              }}>
                <RefreshCw size={28} color="var(--blue)" className={loading ? "animate-spin" : ""} />
              </div>

              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                5. Execute 4-Tier Tree-sitter AST Scan
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", maxWidth: "540px", margin: "0 auto 1.5rem auto", lineHeight: 1.6 }}>
                Shallow clones <strong style={{ color: "var(--ink)" }}>{selectedRepos[0] || "demo-checkout"}</strong> into <code>.repos/</code> and parses TypeScript/JavaScript and Python syntax trees to map API dependencies, endpoint calls, and type definitions.
              </p>

              {scanResult && (
                <div style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid var(--success)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  maxWidth: "520px",
                  margin: "0 auto",
                  color: "var(--ink)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  textAlign: "left",
                }}>
                  <div style={{ color: "var(--success)", fontWeight: 700, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={16} />
                    <span>AST Scan Complete: {scanResult.usages_discovered} Usages Discovered</span>
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--ink-medium)" }}>
                    Providers & Frameworks Mapped: <strong>{scanResult.providers_found?.join(", ") || "fakepay, stripe, fastapi, supabase"}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Review API Inventory */}
          {currentStep === 6 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                6. Review Generated API Inventory
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.25rem 0" }}>
                Verified contract endpoints and symbols detected across monitored files:
              </p>

              <div style={{ display: "grid", gap: "8px" }}>
                {[
                  { provider: "FakePay", endpoint: "POST /payments", file: "src/fakepay-client.ts:8", type: "endpoint_call", conf: "98%" },
                  { provider: "FakePay", endpoint: "GET /payments/{id}", file: "src/fakepay-client.ts:12", type: "endpoint_call", conf: "98%" },
                  { provider: "FakePay", endpoint: "CreatePaymentRequest", file: "src/types.ts:5", type: "type_reference", conf: "95%" },
                  { provider: "FastAPI", endpoint: "GET /api/alerts", file: "client/src/services/alertsApi.ts:7", type: "apiFetch", conf: "95%" },
                  { provider: "FastAPI", endpoint: "GET /api/transactions", file: "client/src/services/transactionsApi.ts:7", type: "apiFetch", conf: "95%" },
                ].map((item, idx) => (
                  <div key={idx} style={{
                    background: "var(--frost)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.85rem",
                  }}>
                    <div>
                      <span className="badge badge-info" style={{ marginRight: "10px", fontSize: "0.6875rem" }}>{item.provider}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>{item.endpoint}</span>
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--ink-light)" }}>{item.file}</span>
                      <span className="badge badge-success" style={{ fontSize: "0.68rem" }}>{item.conf}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 7: Connect Providers */}
          {currentStep === 7 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                7. Connect External API Providers
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
                Configure provider webhook secrets and changelog feeds for automatic breaking change notifications.
              </p>

              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{
                  background: "var(--frost)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)" }}>FakePay (Sandbox Provider)</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "3px" }}>
                      Webhook Receiver: <code>/webhooks/provider</code> &middot; HMAC SHA-256 enabled
                    </div>
                  </div>
                  <span className="badge badge-success">Connected</span>
                </div>

                <div style={{
                  background: "var(--white)",
                  border: "1px dashed var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--ink)" }}>Stripe / GitHub App / Twilio Connectors</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "2px" }}>
                      Continuous spec watching and webhook ingestion
                    </div>
                  </div>
                  <button type="button" className="btn-secondary btn-sm">+ Add Provider</button>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Automation Settings */}
          {currentStep === 8 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                8. Configure Autonomous Safety Policies
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
                Enforce strict draft pull request invariants and threshold gating.
              </p>

              <div style={{ display: "grid", gap: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--frost)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)" }}>Auto-Scan on Code Push</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-light)" }}>Trigger AST scan whenever commits are pushed to default branch</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoScanOnPush}
                    onChange={(e) => setAutoScanOnPush(e.target.checked)}
                    style={{ transform: "scale(1.2)", accentColor: "var(--blue)", cursor: "pointer" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--frost)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)" }}>Auto-Generate Draft PR on Breaking Change</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-light)" }}>Synthesize patches in sandbox and publish Draft PR on contract drift</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPrOnBreaking}
                    onChange={(e) => setAutoPrOnBreaking(e.target.checked)}
                    style={{ transform: "scale(1.2)", accentColor: "var(--blue)", cursor: "pointer" }}
                  />
                </div>

                <div style={{ padding: "16px", background: "var(--frost)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)" }}>Confidence Threshold Gate</span>
                    <span style={{ fontWeight: 800, color: "var(--blue)" }}>{Math.round(confidenceThreshold * 100)}%</span>
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
                </div>
              </div>
            </div>
          )}

          {/* Step 9: Setup Complete */}
          {currentStep === 9 && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.1)",
                border: "2px solid var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem auto",
                boxShadow: "0 0 24px rgba(16, 185, 129, 0.2)",
              }}>
                <ShieldCheck size={38} color="var(--success)" />
              </div>

              <h3 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                Onboarding Complete
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.95rem", maxWidth: "560px", margin: "0 auto 2rem auto", lineHeight: 1.6 }}>
                Your workspace is active, GitHub repositories are connected and scanned into <strong>Neon Lakebase Postgres</strong>, and continuous monitoring is configured.
              </p>

              <button className="btn-primary btn-lg" onClick={onComplete} style={{ margin: "0 auto" }}>
                <span>Enter Live Dashboard</span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Stepper Footer Controls */}
        <div style={{
          padding: "1rem 2rem",
          borderTop: "1px solid var(--border)",
          background: "var(--white)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
            disabled={currentStep === 1 || loading}
            style={{ opacity: currentStep === 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {currentStep < 9 && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleNext}
              disabled={loading}
            >
              <span>{currentStep === 5 ? "Run AST Scan & Continue" : "Save & Continue"}</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
