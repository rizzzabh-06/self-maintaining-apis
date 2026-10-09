import { useState, useRef } from "react";
import {
  GitPullRequest,
  Play,
  FileCode2,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  ChevronRight,
} from "lucide-react";
import { triggerMigration } from "../api/client";

const DEFAULT_DIFFS: Record<string, string[]> = {
  "src/fakepay-client.ts": [
    "@@ -8,9 +8,9 @@ export class FakePayClient {",
    "-    const { data } = await this.http.post<Payment>(\"/payment\", req);",
    "+    const { data } = await this.http.post<Payment>(\"/payments\", req);",
    "     return data;",
    "   }",
    "-  async getPayment(id: string): Promise<Payment> {",
    "-    const { data } = await this.http.get<Payment>(`/payment/${id}`);",
    "+  async getPayment(id: string): Promise<Payment> {",
    "+    const { data } = await this.http.get<Payment>(`/payments/${id}`);",
    "     return data;",
    "   }",
  ],
  "src/checkout.ts": [
    "@@ -15,5 +15,6 @@ export async function processCheckout(",
    "     amount: amountCents,",
    "     source: paymentToken,",
    "     description: `Order ${orderId}`,",
    "-    // currency intentionally omitted — v1 defaults to \"usd\"",
    "+    currency: \"usd\",",
    "   });",
  ],
  "src/config.ts": [
    "@@ -2,2 +2,2 @@ export const config = {",
    "-    baseUrl: process.env.FAKEPAY_API_URL || \"https://api.fakepay.dev/v1\",",
    "+    baseUrl: process.env.FAKEPAY_API_URL || \"https://api.fakepay.dev/v2\",",
    " };",
  ],
  "src/types.ts": [
    "@@ -5,3 +5,3 @@ export interface CreatePaymentRequest {",
    "-  /** Optional in v1 — defaults to USD on the server. */",
    "-  currency?: string;",
    "+  /** Required in v2. */",
    "+  currency: string;",
    " }",
  ],
  "tests/checkout.test.ts": [
    "@@ -32,3 +32,4 @@ describe(\"FakePayClient\", () => {",
    "-    expect(instance.post).toHaveBeenCalledWith(\"/payment\", {",
    "+    expect(instance.post).toHaveBeenCalledWith(\"/payments\", {",
    "       amount: 5000,",
    "       source: \"tok_visa_4242\",",
    "+      currency: \"usd\",",
    "     });",
  ],
};

type SandboxStep = {
  name: string;
  desc: string;
  status: "pending" | "running" | "pass" | "fail";
};

const SANDBOX_STEPS_TEMPLATE: SandboxStep[] = [
  { name: "Patch Application", desc: "Apply 5 unified patches to temp sandbox worktree", status: "pending" },
  { name: "TypeScript Build", desc: "tsc --noEmit — syntax & type checking", status: "pending" },
  { name: "Contract Verification", desc: "Assert /payments endpoint & currency required", status: "pending" },
  { name: "Unit Test Suite", desc: "Vitest — 12 assertions validated", status: "pending" },
];

function classifyLine(line: string): string {
  if (line.startsWith("@@")) return "diff-line-hunk";
  if (line.startsWith("+")) return "diff-line-add";
  if (line.startsWith("-")) return "diff-line-del";
  return "diff-line-ctx";
}

export const Migration: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState("src/fakepay-client.ts");
  const [sandboxSteps, setSandboxSteps] = useState<SandboxStep[]>(
    SANDBOX_STEPS_TEMPLATE.map((s) => ({ ...s }))
  );
  const [terminalLog, setTerminalLog] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");
  const termRef = useRef<HTMLDivElement>(null);

  const appendLog = (msg: string) => {
    setTerminalLog((prev) => [...prev, msg]);
    setTimeout(() => {
      if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
    }, 50);
  };

  const simulateSandbox = async () => {
    const steps: SandboxStep[] = SANDBOX_STEPS_TEMPLATE.map((s) => ({ ...s }));
    setSandboxSteps(steps.map((s) => ({ ...s })));
    setTerminalLog([]);

    appendLog("$ Initializing disposable sandbox worktree...");
    await sleep(400);
    appendLog("✓ Temp sandbox created at /tmp/api-sandbox-d8f92a");

    for (let i = 0; i < steps.length; i++) {
      const msgs: Record<number, string[]> = {
        0: ["$ Applying 5 unified patch files...", "✓ src/fakepay-client.ts patched", "✓ src/checkout.ts patched", "✓ src/config.ts patched", "✓ src/types.ts patched", "✓ tests/checkout.test.ts patched"],
        1: ["$ Running tsc --noEmit...", "✓ 0 errors — compilation successful"],
        2: ["$ Verifying API contract assertions...", "✓ POST /payments endpoint present", "✓ currency field is required in CreatePaymentRequest"],
        3: ["$ Running Vitest test suite...", "✓ 12/12 tests passed", "✓ 0 failures"],
      };

      setSandboxSteps((prev) =>
        prev.map((s, j) => ({ ...s, status: j === i ? "running" : j < i ? "pass" : s.status }))
      );
      for (const msg of msgs[i]) {
        appendLog(msg);
        await sleep(200);
      }
      setSandboxSteps((prev) =>
        prev.map((s, j) => ({ ...s, status: j <= i ? "pass" : s.status }))
      );
      await sleep(300);
    }

    appendLog("");
    appendLog("╔══════════════════════════════════════╗");
    appendLog("║  SANDBOX VALIDATION: PASS (100%)     ║");
    appendLog("║  Draft PR ready for human review     ║");
    appendLog("╚══════════════════════════════════════╝");
  };

  const handleRunMigration = async () => {
    setRunning(true);
    simulateSandbox();
    try {
      const res = await triggerMigration("fakepay", "demo-org/demo-checkout");
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  // Left (old) and right (new) split diff
  const currentDiff = DEFAULT_DIFFS[selectedFile] || [];
  const splitLeft = currentDiff.filter((l) => !l.startsWith("+") || l.startsWith("@@"));
  const splitRight = currentDiff.filter((l) => !l.startsWith("-") || l.startsWith("@@"));

  const allPass = sandboxSteps.every((s) => s.status === "pass");

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
          <div className="section-eyebrow" style={{ color: "var(--accent-indigo)" }}>
            <GitPullRequest size={16} />
            Autonomous Execution & Sandbox
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Migration & Validation Console
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "4px" }}>
            Generates bounded deterministic patches, validates in isolated sandbox, composes a GitHub Draft PR.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={handleRunMigration}
          disabled={running}
          style={{ padding: "11px 22px", fontSize: "0.9rem" }}
        >
          {running ? (
            <>
              <Clock className="animate-spin" size={16} />
              <span>Validating in Sandbox...</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Run Autonomous Migration</span>
            </>
          )}
        </button>
      </div>

      {/* Two-column layout: sandbox + terminal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        {/* Sandbox Steps */}
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <h2
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldCheck size={18} color="var(--accent-emerald)" />
            Sandbox Pipeline
            {allPass && (
              <span className="badge badge-success" style={{ marginLeft: "auto", fontSize: "0.65rem" }}>
                PASS (100%)
              </span>
            )}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {sandboxSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: step.status === "pass"
                    ? "rgba(16,185,129,0.05)"
                    : step.status === "running"
                    ? "rgba(99,102,241,0.05)"
                    : step.status === "fail"
                    ? "rgba(244,63,94,0.05)"
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${
                    step.status === "pass"
                      ? "rgba(16,185,129,0.2)"
                      : step.status === "running"
                      ? "rgba(99,102,241,0.25)"
                      : step.status === "fail"
                      ? "rgba(244,63,94,0.2)"
                      : "var(--border-subtle)"
                  }`,
                  transition: "all var(--transition-base)",
                }}
              >
                <div className={step.status === "running" ? "status-ring running" : ""} style={{ flexShrink: 0 }}>
                  {step.status === "pass" ? (
                    <CheckCircle2 size={22} color="#34d399" />
                  ) : step.status === "fail" ? (
                    <XCircle size={22} color="#fb7185" />
                  ) : step.status === "running" ? (
                    <Clock size={20} color="#818cf8" className="animate-spin" />
                  ) : (
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.87rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {step.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{step.desc}</div>
                </div>
                <span
                  className={`badge ${step.status === "pass" ? "badge-success" : step.status === "running" ? "badge-indigo" : step.status === "fail" ? "badge-critical" : ""}`}
                  style={{ fontSize: "0.62rem", opacity: step.status === "pending" ? 0.3 : 1 }}
                >
                  {step.status === "pending" ? "PENDING" : step.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal Log */}
        <div className="glass-panel" style={{ padding: "1.75rem", display: "flex", flexDirection: "column" }}>
          <h2
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Terminal size={18} color="var(--accent-cyan)" />
            Sandbox Output
          </h2>
          <div
            ref={termRef}
            style={{
              flex: 1,
              background: "#020508",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "var(--radius-md)",
              padding: "14px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              lineHeight: 1.7,
              overflow: "auto",
              minHeight: "220px",
              maxHeight: "300px",
            }}
          >
            {terminalLog.length === 0 ? (
              <span style={{ color: "var(--text-muted)" }}>
                {">"} Waiting for migration run...
              </span>
            ) : (
              terminalLog.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color: line.startsWith("✓")
                      ? "#34d399"
                      : line.startsWith("╔") || line.startsWith("║") || line.startsWith("╚")
                      ? "#818cf8"
                      : line.startsWith("$")
                      ? "#fbbf24"
                      : "var(--text-secondary)",
                  }}
                >
                  {line}
                </div>
              ))
            )}
            {running && (
              <div style={{ color: "var(--accent-cyan)", marginTop: "4px" }}>
                <span className="animate-breathe" style={{ display: "inline-block" }}>
                  _
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code Diff Viewer */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        {/* File selector */}
        <div className="glass-panel" style={{ padding: "1rem" }}>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "10px",
              padding: "0 6px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Modified Files</span>
            <span style={{ color: "var(--accent-cyan)" }}>{Object.keys(DEFAULT_DIFFS).length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {Object.keys(DEFAULT_DIFFS).map((f) => {
              const isSel = selectedFile === f;
              const addCount = DEFAULT_DIFFS[f].filter((l) => l.startsWith("+") && !l.startsWith("++")).length;
              const delCount = DEFAULT_DIFFS[f].filter((l) => l.startsWith("-") && !l.startsWith("--")).length;
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFile(f)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.76rem",
                    fontFamily: "var(--font-mono)",
                    color: isSel ? "#ffffff" : "var(--text-secondary)",
                    background: isSel ? "rgba(99,102,241,0.15)" : "transparent",
                    border: isSel ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    width: "100%",
                  }}
                >
                  <FileCode2 size={13} color={isSel ? "var(--accent-cyan)" : "currentColor"} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {f.split("/").pop()}
                  </span>
                  <span style={{ color: "#34d399", fontSize: "0.65rem", fontWeight: 700 }}>+{addCount}</span>
                  <span style={{ color: "#fb7185", fontSize: "0.65rem", fontWeight: 700 }}>-{delCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Diff content */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              paddingBottom: "10px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "6px" }}>
              <ChevronRight size={14} />
              {selectedFile}
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span className="badge badge-success" style={{ fontSize: "0.62rem" }}>Unified Patch</span>
              {/* View mode toggle */}
              <div
                style={{
                  display: "flex",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                }}
              >
                {(["unified", "split"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      fontFamily: "var(--font-sans)",
                      background: viewMode === m ? "rgba(99,102,241,0.2)" : "transparent",
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
            </div>
          </div>

          {viewMode === "unified" ? (
            <div className="diff-container">
              {currentDiff.map((line, idx) => (
                <span key={idx} className={classifyLine(line)}>
                  {line}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#fb7185", textTransform: "uppercase", marginBottom: "4px" }}>Before (v1)</div>
                <div className="diff-container">
                  {splitLeft.map((line, idx) => (
                    <span key={idx} className={classifyLine(line)}>
                      {line}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase", marginBottom: "4px" }}>After (v2)</div>
                <div className="diff-container">
                  {splitRight.map((line, idx) => (
                    <span key={idx} className={classifyLine(line)}>
                      {line}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GitHub Draft PR Card */}
      <div
        className="glass-panel animate-fade-up"
        style={{
          padding: "2rem",
          background: "linear-gradient(135deg, rgba(10,15,28,0.95), rgba(12,28,44,0.7))",
          border: "1px solid rgba(6,182,212,0.25)",
        }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem", flexWrap: "wrap", gap: "1rem" }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span className="badge badge-success">Gated: PASS</span>
              <span className="badge badge-purple">Draft PR Only</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Branch: api-migration/fakepay-v2-d8f92a
              </span>
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>
              fix(api): migrate FakePay integration (fakepay_v1_to_v2)
            </h3>
          </div>
          <a
            href={result?.pipeline_result?.draft_pr?.pr_url || "https://github.com/demo-org/demo-checkout/pull/101"}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ textDecoration: "none", fontSize: "0.85rem" }}
          >
            <span>Review Draft PR</span>
            <ExternalLink size={14} />
          </a>
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "var(--radius-md)",
            padding: "1.2rem 1.5rem",
            fontSize: "0.83rem",
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px 2rem",
          }}
        >
          <p><strong style={{ color: "var(--text-primary)" }}>Provider:</strong> FakePay</p>
          <p><strong style={{ color: "var(--text-primary)" }}>Confidence:</strong> <span style={{ color: "#34d399", fontWeight: 700 }}>98%</span> (Deterministic Recipe)</p>
          <p><strong style={{ color: "var(--text-primary)" }}>Change:</strong> POST /payment → /payments; currency required</p>
          <p><strong style={{ color: "var(--text-primary)" }}>Impact:</strong> 5 files, 15 usages</p>
          <p><strong style={{ color: "var(--text-primary)" }}>Validation:</strong> ✓ Build ✓ Unit Tests ✓ Contract Checks</p>
          <p><strong style={{ color: "var(--text-primary)" }}>Recipe:</strong> FakePayV1ToV2 (deterministic)</p>
          <div
            style={{
              gridColumn: "1 / -1",
              marginTop: "8px",
              color: "var(--accent-amber)",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ⚠️ Human review required. Validated in disposable sandbox — never auto-merged.
          </div>
        </div>
      </div>
    </div>
  );
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
