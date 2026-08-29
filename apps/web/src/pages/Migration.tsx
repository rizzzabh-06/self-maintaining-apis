import React, { useState } from "react";
import { 
  GitPullRequest, 
  Play, 
  CheckCircle2, 
  Clock, 
  FileCode2, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink,
  Terminal,
  Sparkles
} from "lucide-react";
import { triggerMigration } from "../api/client";

export const Migration: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<string>("src/fakepay-client.ts");

  // Sample default diffs if migration not yet triggered interactively
  const defaultDiffs: Record<string, string[]> = {
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
      "   }"
    ],
    "src/checkout.ts": [
      "@@ -15,5 +15,6 @@ export async function processCheckout(",
      "     amount: amountCents,",
      "     source: paymentToken,",
      "     description: `Order ${orderId}`,",
      "-    // currency intentionally omitted — v1 defaults to \"usd\"",
      "+    currency: \"usd\",",
      "   });"
    ],
    "src/config.ts": [
      "@@ -2,2 +2,2 @@ export const config = {",
      "-    baseUrl: process.env.FAKEPAY_API_URL || \"https://api.fakepay.dev/v1\",",
      "+    baseUrl: process.env.FAKEPAY_API_URL || \"https://api.fakepay.dev/v2\",",
      " };"
    ],
    "src/types.ts": [
      "@@ -5,3 +5,3 @@ export interface CreatePaymentRequest {",
      "-  /** Optional in v1 — defaults to USD on the server. */",
      "-  currency?: string;",
      "+  /** Required in v2. */",
      "+  currency: string;",
      " }"
    ],
    "tests/checkout.test.ts": [
      "@@ -32,3 +32,4 @@ describe(\"FakePayClient\", () => {",
      "-    expect(instance.post).toHaveBeenCalledWith(\"/payment\", {",
      "+    expect(instance.post).toHaveBeenCalledWith(\"/payments\", {",
      "       amount: 5000,",
      "       source: \"tok_visa_4242\",",
      "+      currency: \"usd\",",
      "     });"
    ]
  };

  const handleRunMigration = async () => {
    setRunning(true);
    try {
      const res = await triggerMigration("fakepay", "demo-org/demo-checkout");
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-indigo)", marginBottom: "4px" }}>
            <GitPullRequest size={18} />
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Autonomous Execution & Sandbox
            </span>
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Migration & Validation Console</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Generates bounded deterministic patches, runs isolated sandbox verification, and composes a GitHub Draft PR.
          </p>
        </div>

        <button 
          className="btn-primary" 
          onClick={handleRunMigration}
          disabled={running}
          style={{ padding: "12px 24px", fontSize: "0.95rem" }}
        >
          {running ? (
            <>
              <Clock className="animate-spin" size={18} />
              <span>Validating in Sandbox...</span>
            </>
          ) : (
            <>
              <Play size={18} fill="currentColor" />
              <span>Run Autonomous Migration</span>
            </>
          )}
        </button>
      </div>

      {/* Sandbox Verification Progress */}
      <div className="glass-panel" style={{ padding: "1.8rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={18} color="var(--accent-emerald)" />
          Isolated Disposable Sandbox Pipeline Status
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {[
            { name: "1. Patch Application", status: "PASS", desc: "4 patches applied cleanly in temp sandbox" },
            { name: "2. TypeScript Build", status: "PASS", desc: "Syntax & structure checks verified" },
            { name: "3. Contract Verification", status: "PASS", desc: "Endpoints updated to /payments & currency supplied" },
            { name: "4. Unit Test Suite", status: "PASS", desc: "All contract assertions green (100%)" },
          ].map((s, idx) => (
            <div key={idx} style={{
              background: "rgba(16, 185, 129, 0.04)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "10px",
              padding: "1rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>{s.name}</span>
                <span className="badge badge-success" style={{ fontSize: "0.68rem" }}>{s.status}</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Code Diff Viewer */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* File selector sidebar */}
        <div className="glass-panel" style={{ padding: "1rem" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "10px", padding: "0 8px" }}>
            Modified Files ({Object.keys(defaultDiffs).length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {Object.keys(defaultDiffs).map((f) => {
              const isSel = selectedFile === f;
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFile(f)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-mono)",
                    color: isSel ? "#ffffff" : "var(--text-secondary)",
                    background: isSel ? "rgba(99, 102, 241, 0.2)" : "transparent",
                    border: isSel ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <FileCode2 size={14} color={isSel ? "var(--accent-cyan)" : "currentColor"} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Diff content view */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.88rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
              {selectedFile}
            </div>
            <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>
              Unified Patch
            </span>
          </div>

          <div className="diff-container">
            {(defaultDiffs[selectedFile] || []).map((line, idx) => {
              let cls = "diff-line-ctx";
              if (line.startsWith("+")) cls = "diff-line-add";
              if (line.startsWith("-")) cls = "diff-line-del";
              return (
                <span key={idx} className={cls}>
                  {line}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* GitHub Draft PR Card */}
      <div className="glass-panel" style={{
        padding: "2rem",
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(15, 35, 55, 0.6))",
        border: "1px solid rgba(6, 182, 212, 0.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span className="badge badge-success">Gated: PASS</span>
              <span className="badge badge-purple">Draft PR Only</span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Branch: api-migration/fakepay-v2-d8f92a</span>
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
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
            <ExternalLink size={15} />
          </a>
        </div>

        <div style={{
          background: "rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "8px",
          padding: "1.2rem",
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}>
          <p><strong>Provider:</strong> FakePay</p>
          <p><strong>Change:</strong> POST /payment → /payments, required currency field</p>
          <p><strong>Impact:</strong> 4 files, 15 usage locations</p>
          <p><strong>Validation:</strong> ✓ Build ✓ Unit Tests ✓ Contract Checks</p>
          <p><strong>Confidence:</strong> 98% (Deterministic Recipe)</p>
          <div style={{ marginTop: "10px", color: "var(--accent-amber)", fontSize: "0.8rem", fontWeight: 600 }}>
            ⚠️ Human review required. Validated in disposable sandbox; never auto-merged.
          </div>
        </div>
      </div>
    </div>
  );
};
