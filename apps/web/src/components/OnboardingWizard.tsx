import { useState } from "react";
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  FolderGit2, 
  ShieldCheck, 
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
      setLoading(true);
      try {
        await connectGitHub(githubToken || undefined, githubAccount);
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 4) {
      setLoading(true);
      try {
        for (const r of selectedRepos) {
          await connectRepository(r);
        }
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 5) {
      setLoading(true);
      try {
        const res = await triggerRepositoryScan("repo_demo_checkout");
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
      background: "rgba(11, 18, 34, 0.55)",
      backdropFilter: "blur(8px)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div className="card modal-content" style={{
        width: "100%",
        maxWidth: "920px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
      }}>
        {/* Stepper Header */}
        <div style={{
          padding: "1.5rem 2rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--white)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-sm)",
                background: "var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--white)",
              }}>
                <FolderGit2 size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--ink)", margin: 0 }}>Onboarding & Repository Setup</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--ink-light)", margin: "2px 0 0 0" }}>Step {currentStep} of 9 • {steps[currentStep - 1].title}</p>
              </div>
            </div>

            <button 
              onClick={onCancel}
              style={{
                background: "none",
                border: "none",
                color: "var(--ink-light)",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 500,
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
                    gap: "5px",
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
                    fontSize: "0.7rem",
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
        <div style={{ padding: "2.5rem", flex: 1, overflowY: "auto", background: "var(--white)" }}>
          {/* Step 1: Log in */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                1. Log in to the Platform
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.8rem 0" }}>
                Authenticated session active with Neon Lakebase Postgres backend.
              </p>
              
              <div style={{
                background: "var(--frost)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}>
                <img 
                  src="https://avatars.githubusercontent.com/u/9919?v=4" 
                  alt="Avatar" 
                  style={{ width: "52px", height: "52px", borderRadius: "50%", border: "2px solid var(--border)" }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink)" }}>Rizzabh Admin</div>
                  <div style={{ color: "var(--ink-light)", fontSize: "0.85rem" }}>admin@example.com</div>
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
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                2. Select or Create a Workspace
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.8rem 0" }}>
                Workspaces group monitored repositories, API provider credentials, and migration audit logs.
              </p>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>
                  Workspace / Organization Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
                <div style={{ fontSize: "0.8rem", color: "var(--ink-light)", marginTop: "6px" }}>
                  Linked Neon Org ID: <code style={{ color: "var(--blue)", fontFamily: "var(--font-mono)" }}>org-wispy-boat-92392834</code>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Connect GitHub */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                3. Connect GitHub (App Authorization)
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.8rem 0" }}>
                Authorize the GitHub App to read code, execute isolated sandbox scans, and open draft pull requests.
              </p>

              <div style={{ display: "grid", gap: "1.25rem" }}>
                <div style={{
                  background: "var(--frost)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "1.25rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <FolderGit2 size={18} color="var(--blue)" />
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>GitHub App Scopes Requested:</span>
                  </div>
                  <ul style={{ fontSize: "0.85rem", color: "var(--ink-medium)", paddingLeft: "1.4rem", lineHeight: 1.6, margin: 0 }}>
                    <li><code>Contents: Read/Write</code> — for AST scanning and migration branch patches</li>
                    <li><code>Pull Requests: Read/Write</code> — strictly for <strong>Draft PRs</strong></li>
                    <li><code>Webhooks: Read</code> — for push events</li>
                  </ul>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
                    GitHub Organization / User Login
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={githubAccount}
                    onChange={(e) => setGithubAccount(e.target.value)}
                    placeholder="e.g. demo-org or your-username"
                    style={{ marginBottom: "12px" }}
                  />

                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
                    Personal Access Token / OAuth Token (Optional in Sandbox)
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_••••••••••••••••••••••••"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Select Repositories */}
          {currentStep === 4 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                4. Select Repositories for Ingestion
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
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
                        background: isChecked ? "rgba(41, 181, 232, 0.06)" : "var(--frost)",
                        border: isChecked ? "1px solid var(--blue)" : "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "1rem 1.25rem",
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
                          <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.92rem", color: "var(--ink)" }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--ink-light)", marginTop: "2px" }}>
                            {r.desc}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>{r.lang}</span>
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
                background: "var(--frost)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem auto",
              }}>
                <RefreshCw size={28} color="var(--blue)" className={loading ? "animate-spin" : ""} />
              </div>

              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                5. Run Initial AST Codebase Scan
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", maxWidth: "520px", margin: "0 auto 1.8rem auto", lineHeight: 1.5 }}>
                The agent will run 4-tier discovery across your TypeScript codebase to identify external SDK dependencies, config URLs, API endpoints, and type signatures.
              </p>

              {scanResult && (
                <div style={{
                  background: "rgba(15, 157, 88, 0.06)",
                  border: "1px solid rgba(15, 157, 88, 0.25)",
                  borderRadius: "var(--radius-sm)",
                  padding: "1rem",
                  maxWidth: "480px",
                  margin: "0 auto",
                  color: "var(--success)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}>
                  Scan Complete: {scanResult.usages_discovered} API usages discovered & indexed in Neon Postgres
                </div>
              )}
            </div>
          )}

          {/* Step 6: Review API Inventory */}
          {currentStep === 6 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                6. Review Generated API Inventory
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
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
                      <span style={{ fontWeight: 700, color: "var(--blue)", marginRight: "10px" }}>{item.provider}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 500 }}>{item.endpoint}</span>
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
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                7. Connect External API Providers
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
                Configure provider webhook secrets and changelog feeds for automatic breaking change notifications.
              </p>

              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{
                  background: "var(--frost)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)" }}>FakePay (Sandbox Provider)</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "3px" }}>
                      Webhook: <code>/webhooks/provider</code> (HMAC SHA-256 enabled)
                    </div>
                  </div>
                  <span className="badge badge-success">Connected</span>
                </div>

                <div style={{
                  background: "var(--white)",
                  border: "1px dashed var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--ink-medium)" }}>Stripe / Twilio / OpenAI Connectors</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "2px" }}>
                      Available for additional webhook triggers
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ fontSize: "0.78rem", padding: "6px 12px" }}>+ Add</button>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Automation Settings */}
          {currentStep === 8 && (
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                8. Configure Automation Settings
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", margin: "0 0 1.8rem 0" }}>
                Control autonomous pipeline behavior and human review invariants.
              </p>

              <div style={{ display: "grid", gap: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--frost)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--ink)" }}>Auto-Scan on Code Push</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-light)" }}>Rescan repository AST inventory whenever branches update</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoScanOnPush}
                    onChange={(e) => setAutoScanOnPush(e.target.checked)}
                    style={{ transform: "scale(1.2)", accentColor: "var(--blue)", cursor: "pointer" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--frost)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--ink)" }}>Auto-Generate Draft PR on Breaking Change</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-light)" }}>Run isolated sandbox & open Draft PR when provider upgrades</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPrOnBreaking}
                    onChange={(e) => setAutoPrOnBreaking(e.target.checked)}
                    style={{ transform: "scale(1.2)", accentColor: "var(--blue)", cursor: "pointer" }}
                  />
                </div>

                <div style={{ padding: "14px", background: "var(--frost)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--ink)" }}>Confidence Threshold Gate</span>
                    <span style={{ fontWeight: 700, color: "var(--ink)" }}>{Math.round(confidenceThreshold * 100)}%</span>
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

                <div style={{
                  background: "rgba(41, 181, 232, 0.05)",
                  border: "1px solid rgba(41, 181, 232, 0.25)",
                  borderLeft: "4px solid var(--blue)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 14px",
                  fontSize: "0.85rem",
                  color: "var(--ink-medium)",
                }}>
                  <strong style={{ color: "var(--ink)" }}>Safety Invariant Enforced:</strong> All automated pull requests are marked as <code>draft: true</code> and require human merge approval.
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
                background: "var(--frost)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem auto",
              }}>
                <ShieldCheck size={36} color="var(--blue)" />
              </div>

              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
                9. Setup Complete
              </h3>
              <p style={{ color: "var(--ink-light)", fontSize: "0.92rem", maxWidth: "520px", margin: "0 auto 2rem auto", lineHeight: 1.6 }}>
                Your workspace is active, GitHub repositories are connected and scanned into <strong>Neon Lakebase Postgres</strong>, and continuous monitoring is configured.
              </p>

              <button className="btn-primary" onClick={onComplete} style={{ padding: "12px 26px", fontSize: "0.95rem" }}>
                <span>Enter Live Dashboard</span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Stepper Footer Controls */}
        <div style={{
          padding: "1.2rem 2rem",
          borderTop: "1px solid var(--border)",
          background: "var(--white)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <button
            className="btn-secondary"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
            disabled={currentStep === 1 || loading}
            style={{ opacity: currentStep === 1 ? 0.4 : 1, padding: "8px 16px" }}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {currentStep < 9 && (
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={loading}
              style={{ padding: "8px 18px" }}
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

