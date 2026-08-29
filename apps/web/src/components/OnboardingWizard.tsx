import { useState } from "react";
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  FolderGit2, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw
} from "lucide-react";
import { 
  connectGitHub, 
  connectRepository, 
  triggerRepositoryScan, 
  updateAutomationSettings 
} from "../api/client";

interface OnboardingWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("Rizzabh");
  const [githubToken, setGithubToken] = useState("");
  const [githubAccount, setGithubAccount] = useState("demo-org");
  const [selectedRepos, setSelectedRepos] = useState<string[]>(["demo-org/demo-checkout"]);
  const [scanResult, setScanResult] = useState<any>(null);
  
  // Automation settings
  const [autoScanOnPush, setAutoScanOnPush] = useState(true);
  const [autoPrOnBreaking, setAutoPrOnBreaking] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.90);

  const availableRepos = [
    { name: "demo-org/demo-checkout", lang: "TypeScript", desc: "E-commerce checkout microservice with FakePay connector." },
    { name: "demo-org/payments-worker", lang: "TypeScript", desc: "Background webhook processor for payment events." },
    { name: "demo-org/billing-service", lang: "TypeScript", desc: "Subscription billing engine with Stripe integration." },
  ];

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

  const handleNext = async () => {
    if (currentStep === 3) {
      // Connect GitHub
      setLoading(true);
      try {
        await connectGitHub(githubToken || undefined, githubAccount);
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 4) {
      // Connect selected repos
      setLoading(true);
      try {
        for (const r of selectedRepos) {
          await connectRepository(r);
        }
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 5) {
      // Run scan on first selected repo
      setLoading(true);
      try {
        const res = await triggerRepositoryScan("repo_demo_checkout");
        setScanResult(res);
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 8) {
      // Save automation settings
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

  const toggleRepo = (repo: string) => {
    if (selectedRepos.includes(repo)) {
      setSelectedRepos(selectedRepos.filter((r) => r !== repo));
    } else {
      setSelectedRepos([...selectedRepos, repo]);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(5, 8, 16, 0.88)",
      backdropFilter: "blur(24px)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "900px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid rgba(99, 102, 241, 0.4)",
        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9)",
      }}>
        {/* Stepper Header */}
        <div style={{
          padding: "1.5rem 2rem",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(15, 23, 42, 0.9)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Sparkles size={18} color="#ffffff" />
              </div>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Onboarding & Repository Setup</h2>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Step {currentStep} of 9 • {steps[currentStep - 1].title}</p>
              </div>
            </div>

            <button 
              onClick={onCancel}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Skip to Dashboard
            </button>
          </div>

          {/* Stepper Dots / Pills */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
            {steps.map((s) => {
              const isPassed = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div
                  key={s.num}
                  style={{
                    flex: 1,
                    minWidth: "70px",
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
                    background: isPassed ? "#10b981" : isCurrent ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.1)",
                    transition: "all 0.3s ease",
                  }} />
                  <span style={{
                    fontSize: "0.68rem",
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? "#ffffff" : isPassed ? "#34d399" : "var(--text-muted)",
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
        <div style={{ padding: "2.5rem", flex: 1, overflowY: "auto" }}>
          {/* Step 1: Log in */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                1. Log in to the Platform
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.8rem" }}>
                Authenticated session active with Neon Lakebase Postgres backend.
              </p>
              
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}>
                <img 
                  src="https://avatars.githubusercontent.com/u/9919?v=4" 
                  alt="Avatar" 
                  style={{ width: "52px", height: "52px", borderRadius: "50%", border: "2px solid var(--accent-indigo)" }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>Rizzabh Admin</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>admin@example.com</div>
                  <div style={{ marginTop: "6px" }}>
                    <span className="badge badge-success">Active Session</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Create Workspace */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                2. Select or Create a Workspace
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.8rem" }}>
                Workspaces group monitored repositories, API provider credentials, and migration audit logs.
              </p>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Workspace / Organization Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>
                  Linked Neon Org ID: <code style={{ color: "var(--accent-cyan)" }}>org-wispy-boat-92392834</code>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Connect GitHub */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                3. Connect GitHub (App Authorization)
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.8rem" }}>
                Authorize the GitHub App to read code, execute isolated sandbox scans, and open draft pull requests.
              </p>

              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  borderRadius: "10px",
                  padding: "1.2rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <FolderGit2 size={20} color="var(--accent-indigo)" />
                    <span style={{ fontWeight: 700 }}>GitHub App Scopes Requested:</span>
                  </div>
                  <ul style={{ fontSize: "0.85rem", color: "var(--text-secondary)", paddingLeft: "1.4rem", lineHeight: 1.6 }}>
                    <li><code>Contents: Read/Write</code> — for AST scanning and migration branch patches</li>
                    <li><code>Pull Requests: Read/Write</code> — strictly for <strong>Draft PRs</strong></li>
                    <li><code>Webhooks: Read</code> — for push events</li>
                  </ul>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    GitHub Organization / User Login
                  </label>
                  <input
                    type="text"
                    value={githubAccount}
                    onChange={(e) => setGithubAccount(e.target.value)}
                    placeholder="e.g. demo-org or your-username"
                    style={{
                      width: "100%",
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      color: "#ffffff",
                      fontSize: "0.9rem",
                      outline: "none",
                      marginBottom: "12px",
                    }}
                  />

                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Personal Access Token / OAuth Token (Optional in Sandbox)
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_••••••••••••••••••••••••"
                    style={{
                      width: "100%",
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      color: "#ffffff",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Select Repositories */}
          {currentStep === 4 && (
            <div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                4. Select Repositories for Ingestion
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Choose which codebases the agent should scan and maintain.
              </p>

              <div style={{ display: "grid", gap: "10px" }}>
                {availableRepos.map((r) => {
                  const isChecked = selectedRepos.includes(r.name);
                  return (
                    <div
                      key={r.name}
                      onClick={() => toggleRepo(r.name)}
                      style={{
                        background: isChecked ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.02)",
                        border: isChecked ? "1px solid var(--accent-indigo)" : "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "1rem 1.2rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "6px",
                          border: isChecked ? "none" : "1px solid var(--border-subtle)",
                          background: isChecked ? "var(--accent-indigo)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          {isChecked && <Check size={14} color="#ffffff" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.92rem", color: "#ffffff" }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                            {r.desc}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>{r.lang}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Initial Scan */}
          {currentStep === 5 && (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <div style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "rgba(6, 182, 212, 0.15)",
                border: "1px solid var(--accent-cyan)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem auto",
              }}>
                <RefreshCw size={32} color="var(--accent-cyan)" className={loading ? "animate-spin" : ""} />
              </div>

              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                5. Run Initial AST Codebase Scan
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "500px", margin: "0 auto 1.8rem auto" }}>
                The agent will run 4-tier discovery across your TypeScript codebase to identify external SDK dependencies, config URLs, API endpoints, and type signatures.
              </p>

              {scanResult && (
                <div style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "10px",
                  padding: "1rem",
                  maxWidth: "450px",
                  margin: "0 auto",
                  color: "#34d399",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}>
                  ✓ Scan Complete: {scanResult.usages_discovered} API usages discovered & indexed in Neon Postgres!
                </div>
              )}
            </div>
          )}

          {/* Step 6: Review API Inventory */}
          {currentStep === 6 && (
            <div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                6. Review Generated API Inventory
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Verified inventory of external API dependencies detected in <code>demo-checkout</code>.
              </p>

              <div style={{ display: "grid", gap: "8px" }}>
                {[
                  { provider: "FakePay", endpoint: "POST /payment", file: "src/fakepay-client.ts:8", type: "endpoint_call", conf: "100%" },
                  { provider: "FakePay", endpoint: "GET /payment/{id}", file: "src/fakepay-client.ts:12", type: "endpoint_call", conf: "100%" },
                  { provider: "FakePay", endpoint: "CreatePaymentRequest", file: "src/types.ts:5", type: "type_reference", conf: "95%" },
                  { provider: "FakePay", endpoint: "baseUrl: https://api.fakepay.dev/v1", file: "src/config.ts:2", type: "base_url_config", conf: "100%" },
                ].map((item, idx) => (
                  <div key={idx} style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.85rem",
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, color: "var(--accent-cyan)", marginRight: "10px" }}>{item.provider}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#ffffff" }}>{item.endpoint}</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>{item.file}</span>
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
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                7. Connect External API Providers
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Configure provider webhook secrets and changelog feeds for automatic breaking change notifications.
              </p>

              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "1.2rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>FakePay (Sandbox Provider)</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Webhook: <code>/webhooks/provider</code> (HMAC SHA-256 enabled)
                    </div>
                  </div>
                  <span className="badge badge-success">Connected</span>
                </div>

                <div style={{
                  background: "rgba(255, 255, 255, 0.01)",
                  border: "1px dashed var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "1.2rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Stripe / Twilio / OpenAI Connectors</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Available for additional webhook triggers
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ fontSize: "0.75rem" }}>+ Add</button>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Automation Settings */}
          {currentStep === 8 && (
            <div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                8. Configure Automation Settings
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.8rem" }}>
                Control autonomous pipeline behavior and human review invariants.
              </p>

              <div style={{ display: "grid", gap: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Auto-Scan on Code Push</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Rescan repository AST inventory whenever branches update</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoScanOnPush}
                    onChange={(e) => setAutoScanOnPush(e.target.checked)}
                    style={{ transform: "scale(1.3)", cursor: "pointer" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Auto-Generate Draft PR on Breaking Change</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Run isolated sandbox & open Draft PR when provider upgrades</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPrOnBreaking}
                    onChange={(e) => setAutoPrOnBreaking(e.target.checked)}
                    style={{ transform: "scale(1.3)", cursor: "pointer" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Confidence Threshold Gate</span>
                    <span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{Math.round(confidenceThreshold * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-indigo)" }}
                  />
                </div>

                <div style={{
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                }}>
                  🔒 <strong>Safety Invariant Enforced:</strong> All automated pull requests are marked as <code>draft: true</code> and require human merge approval.
                </div>
              </div>
            </div>
          )}

          {/* Step 9: Ready */}
          {currentStep === 9 && (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <div style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid #10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem auto",
              }}>
                <ShieldCheck size={36} color="#34d399" />
              </div>

              <h3 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                9. Setup Complete!
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", maxWidth: "520px", margin: "0 auto 2rem auto", lineHeight: 1.6 }}>
                Your workspace is active, GitHub repositories are connected and scanned into <strong>Neon Lakebase Postgres</strong>, and continuous monitoring is configured.
              </p>

              <button className="btn-primary" onClick={onComplete} style={{ padding: "14px 28px", fontSize: "1rem" }}>
                <span>Enter Live Dashboard</span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Stepper Footer Controls */}
        <div style={{
          padding: "1.2rem 2rem",
          borderTop: "1px solid var(--border-subtle)",
          background: "rgba(15, 23, 42, 0.9)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <button
            className="btn-secondary"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
            disabled={currentStep === 1 || loading}
            style={{ opacity: currentStep === 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {currentStep < 9 && (
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={loading}
            >
              <span>{currentStep === 5 ? "Run Scan & Continue" : "Save & Continue"}</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
