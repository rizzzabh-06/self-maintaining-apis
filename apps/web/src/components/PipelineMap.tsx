import React, { useState } from "react";
import {
  Zap,
  Activity,
  Terminal,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  GitPullRequest,
  CheckCircle2,
  Cpu,
  Clock,
  ExternalLink,
  Code2,
  Lock,
} from "lucide-react";

export interface PipelineStage {
  id: string;
  number: number;
  title: string;
  category: "INGESTION" | "STATIC AST" | "BLAST RADIUS" | "AI SYNTHESIS" | "SANDBOX" | "GITHUB PR";
  desc: string;
  icon: React.ElementType;
  status: "complete" | "running" | "idle";
  metric: string;
  latency: string;
  details: {
    engine: string;
    description: string;
    inputs: string[];
    outputs: string[];
    safetyGuarantee?: string;
    codeSnippet?: string;
  };
}

const STAGES: PipelineStage[] = [
  {
    id: "spec-ingest",
    number: 1,
    title: "Spec Ingestion",
    category: "INGESTION",
    desc: "OpenAPI 3.1 & RSS Feed Watcher",
    icon: Zap,
    status: "complete",
    metric: "v2.0.0 Spec Ingested",
    latency: "45ms",
    details: {
      engine: "OpenAPI 3.1 Schema Engine & RSS Ingestion",
      description: "Continuously tracks upstream API releases, OpenAPI specs, and developer changelogs via webhooks and scheduled RSS pollers.",
      inputs: ["https://api.fakepay.dev/v2/openapi.json", "GitHub Release Webhook", "APIs.guru Registry"],
      outputs: ["Normalized Spec AST", "Semantic Version Diff", "Deprecation Schedule"],
      safetyGuarantee: "Cryptographic HMAC SHA-256 verification on all inbound webhooks.",
      codeSnippet: `// Upstream API Change Detected
POST /payment → POST /payments (Renamed)
GET /payment/{id} → GET /payments/{id} (Renamed)
currency: required string (was optional, defaulted to 'usd')`,
    },
  },
  {
    id: "change-engine",
    number: 2,
    title: "Change Diff Engine",
    category: "INGESTION",
    desc: "Semantic AST Contract Diff",
    icon: Activity,
    status: "complete",
    metric: "3 Breaking Changes",
    latency: "82ms",
    details: {
      engine: "Semantic Specification Graph Diff",
      description: "Classifies changes into Breaking, Deprecation, or Additive. Computes exact contract delta between v1 and v2.",
      inputs: ["FakePay v1.0.0 OpenAPI AST", "FakePay v2.0.0 OpenAPI AST"],
      outputs: ["3 Breaking Changes Detected", "Severity: Critical", "Migration Recipe Candidate: fakepay_v1_to_v2"],
      safetyGuarantee: "Zero false negatives on breaking schema alterations (type widening/narrowing).",
    },
  },
  {
    id: "ast-scanner",
    number: 3,
    title: "Tree-sitter AST Scan",
    category: "STATIC AST",
    desc: "4-Tier Codebase Symbol Parsing",
    icon: Terminal,
    status: "complete",
    metric: "51 Usages Discovered",
    latency: "140ms",
    details: {
      engine: "Tree-sitter AST & Multi-language Static Analyzer",
      description: "Parses TypeScript, JavaScript, and Python syntax trees without executing code. Locates all SDK imports, HTTP calls, endpoint strings, and type references.",
      inputs: ["Monitored Repo Source Trees (client/, backend/, src/)"],
      outputs: ["51 API Usages Indexed in Neon Postgres", "Symbol Map: createPayment, FakePayClient, apiFetch"],
      safetyGuarantee: "100% read-only AST parsing in sandboxed memory.",
      codeSnippet: `// Discovered AST Usages
[TypeScript] apiFetch('/api/entities') at client/src/services/entitiesApi.ts:7
[TypeScript] this.http.post('/payment', req) at src/fakepay-client.ts:9
[Python] @router.get('/{alert_id}') at backend/app/api/routes/alerts.py:70`,
    },
  },
  {
    id: "impact-engine",
    number: 4,
    title: "Impact Graph",
    category: "BLAST RADIUS",
    desc: "Caller/Callee Blast Radius",
    icon: AlertTriangle,
    status: "complete",
    metric: "5 Files / High Risk",
    latency: "60ms",
    details: {
      engine: "Call-Graph Dependency Tracer",
      description: "Traverses call graphs and import chains to determine which files and functions will break when the external API changes.",
      inputs: ["Discovered AST Usages", "Normalized API Change Model"],
      outputs: ["5 Files in Direct Blast Radius", "13 Calling Call Sites", "Overall Risk: Critical"],
      safetyGuarantee: "Bounded scope isolation — isolates only affected files for modification.",
    },
  },
  {
    id: "ai-synthesis",
    number: 5,
    title: "AI Synthesis & Recipes",
    category: "AI SYNTHESIS",
    desc: "Bounded Gemini LLM Patch Engine",
    icon: Sparkles,
    status: "complete",
    metric: "98% Confidence",
    latency: "1,200ms",
    details: {
      engine: "Gemini 2.5 Flash / Pro + Deterministic Recipe Engine",
      description: "Generates unified surgical patches for affected files. First attempts validated deterministic AST transform recipes; falls back to strictly bounded LLM synthesis with temperature 0.1.",
      inputs: ["Affected File Snippets", "Target Contract Assertions", "Deterministic AST Recipe"],
      outputs: ["5 File Patches (Unified Diff Format)", "Recipe: fakepay_v1_to_v2", "Confidence Score: 98%"],
      safetyGuarantee: "Strict Bounded Context: LLM only sees affected files, never entire repository. Zero hallucination guarantee through post-synthesis syntax check.",
      codeSnippet: `// Synthesized Bounded Patch (src/fakepay-client.ts)
@@ -8,9 +8,9 @@
-    const { data } = await this.http.post<Payment>("/payment", req);
+    const { data } = await this.http.post<Payment>("/payments", req);
     return data;`,
    },
  },
  {
    id: "sandbox-validation",
    number: 6,
    title: "Isolated Sandbox",
    category: "SANDBOX",
    desc: "Ephemeral Docker & Test Matrix",
    icon: ShieldCheck,
    status: "complete",
    metric: "PASS (100%)",
    latency: "3,800ms",
    details: {
      engine: "Ephemeral Disposable Container Sandbox",
      description: "Applies generated patches to a clean disposable worktree. Executes compiler, linter, contract assertions, and existing unit test suite in isolation.",
      inputs: ["5 Unified File Patches", "Clean Workspace Worktree"],
      outputs: ["tsc --noEmit: 0 Errors (PASS)", "Contract Assertion: /payments & currency (PASS)", "Vitest Test Suite: 12/12 Passed (PASS)"],
      safetyGuarantee: "Code is NEVER opened as PR unless 100% of validation checks return PASS.",
      codeSnippet: `✓ Patch Application: 5 unified diffs applied cleanly
✓ TypeScript Compilation: 0 errors (tsc --noEmit)
✓ Contract Verification: POST /payments endpoint verified
✓ Vitest Test Suite: 12 assertions passed in 180ms`,
    },
  },
  {
    id: "draft-pr",
    number: 7,
    title: "GitHub Draft PR",
    category: "GITHUB PR",
    desc: "Strict Draft PR Invariant",
    icon: GitPullRequest,
    status: "complete",
    metric: "PR #101 Ready",
    latency: "350ms",
    details: {
      engine: "GitHub REST API Pull Request Client",
      description: "Pushes isolated migration branch and opens a Draft Pull Request with comprehensive changelog, test evidence, confidence metrics, and diff explanations.",
      inputs: ["Validated Patch Set", "Validation Run ID"],
      outputs: ["Branch: api-migration/fakepay-5713a9ff", "Draft PR #101 Created", "Awaiting Human Review"],
      safetyGuarantee: "ARCHITECTURAL INVARIANT: is_draft = true is hardcoded. Agent NEVER merges code automatically. Human-in-the-loop signoff required.",
    },
  },
];

interface PipelineMapProps {
  onStageSelect?: (stageId: string) => void;
  compact?: boolean;
}

export const PipelineMap: React.FC<PipelineMapProps> = ({ onStageSelect, compact = false }) => {
  const [selectedStageId, setSelectedStageId] = useState<string>("ai-synthesis");

  const selectedStage = STAGES.find((s) => s.id === selectedStageId) || STAGES[4];

  const handleStageClick = (stage: PipelineStage) => {
    setSelectedStageId(stage.id);
    onStageSelect?.(stage.id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Top Banner: Architecture & Invariant Status */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 30, 54, 0.96) 0%, rgba(20, 45, 82, 0.98) 100%)",
          borderRadius: "var(--radius-lg)",
          padding: compact ? "1rem 1.25rem" : "1.25rem 1.75rem",
          color: "var(--white)",
          boxShadow: "0 8px 32px rgba(15, 30, 54, 0.12)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, var(--blue) 0%, #0284c7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(41, 181, 232, 0.4)",
              }}
            >
              <Cpu size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--white)", margin: 0, letterSpacing: "-0.01em" }}>
                  Autonomous Maintenance Pipeline Map
                </h3>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
                  ACTIVE &amp; GATED
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.8125rem", color: "rgba(255, 255, 255, 0.7)" }}>
                Continuous 7-stage pipeline: Contract Ingestion → Tree-sitter AST → Bounded Gemini AI → Disposable Docker Sandbox → GitHub Draft PR.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ textAlign: "right", fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.6)" }}>
              <div>Core Invariant</div>
              <strong style={{ color: "var(--white)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Lock size={12} color="var(--blue)" /> Strict Draft PR Only
              </strong>
            </div>
          </div>
        </div>

        {/* The Visual Stage Flow Map */}
        <div
          style={{
            marginTop: "1.25rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "8px",
            position: "relative",
          }}
        >
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const isSelected = selectedStageId === stage.id;
            return (
              <div
                key={stage.id}
                onClick={() => handleStageClick(stage)}
                style={{
                  background: isSelected
                    ? "rgba(41, 181, 232, 0.18)"
                    : "rgba(255, 255, 255, 0.05)",
                  border: isSelected
                    ? "1px solid var(--blue)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 10px 8px 10px",
                  cursor: "pointer",
                  transition: "all 200ms ease",
                  transform: isSelected ? "translateY(-2px)" : "none",
                  boxShadow: isSelected ? "0 4px 16px rgba(41, 181, 232, 0.3)" : "none",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "104px",
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      background: isSelected ? "var(--blue)" : "rgba(255, 255, 255, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isSelected ? "var(--ink)" : "var(--white)",
                    }}
                  >
                    <Icon size={13} />
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      color: isSelected ? "var(--blue)" : "rgba(255, 255, 255, 0.4)",
                    }}
                  >
                    0{stage.number}
                  </span>
                </div>

                {/* Title & Category */}
                <div style={{ margin: "6px 0 4px 0" }}>
                  <div
                    style={{
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: isSelected ? "var(--blue)" : "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    {stage.category}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      color: "var(--white)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {stage.title}
                  </div>
                </div>

                {/* Status pill / metric */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    color: stage.status === "complete" ? "#34d399" : "var(--blue)",
                    background: stage.status === "complete" ? "rgba(16, 185, 129, 0.15)" : "rgba(41, 181, 232, 0.15)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    width: "fit-content",
                  }}
                >
                  <CheckCircle2 size={10} />
                  <span>{stage.metric}</span>
                </div>

                {/* Active indicator dot */}
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-5px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "var(--blue)",
                      boxShadow: "0 0 10px var(--blue)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Detail Inspector (AI UI & Execution Telemetry) */}
      <div
        className="glass-panel"
        style={{
          padding: "1.5rem",
          background: "var(--white)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "1.5rem",
        }}
      >
        {/* Left: Stage Overview & Deep Telemetry */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span className="badge badge-info" style={{ fontSize: "0.6875rem" }}>
              Stage 0{selectedStage.number} &middot; {selectedStage.category}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--ink-light)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={12} /> Execution Latency: <strong>{selectedStage.latency}</strong>
            </span>
          </div>

          <h4 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", margin: "0 0 8px 0" }}>
            {selectedStage.title}: {selectedStage.details.engine}
          </h4>

          <p style={{ fontSize: "0.875rem", color: "var(--ink-medium)", lineHeight: 1.6, margin: "0 0 1rem 0" }}>
            {selectedStage.details.description}
          </p>

          {/* Safety Guarantee Callout */}
          {selectedStage.details.safetyGuarantee && (
            <div
              style={{
                background: "rgba(41, 181, 232, 0.08)",
                border: "1px solid rgba(41, 181, 232, 0.3)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                marginBottom: "1rem",
              }}
            >
              <ShieldCheck size={18} color="var(--blue)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ fontSize: "0.8125rem", color: "var(--blue-dark)" }}>Safety Invariant: </strong>
                <span style={{ fontSize: "0.8125rem", color: "var(--ink)" }}>{selectedStage.details.safetyGuarantee}</span>
              </div>
            </div>
          )}

          {/* Inputs & Outputs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-light)", textTransform: "uppercase", marginBottom: "6px" }}>
                Inputs Consumed
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8125rem", color: "var(--ink-medium)", lineHeight: 1.6 }}>
                {selectedStage.details.inputs.map((inp, i) => (
                  <li key={i}>{inp}</li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-light)", textTransform: "uppercase", marginBottom: "6px" }}>
                Outputs Produced
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8125rem", color: "var(--ink-medium)", lineHeight: 1.6 }}>
                {selectedStage.details.outputs.map((out, i) => (
                  <li key={i}><strong>{out}</strong></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Real Code / Diff Snippet & AI Inspector Terminal */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#0f1e36",
              padding: "8px 14px",
              borderTopLeftRadius: "var(--radius-md)",
              borderTopRightRadius: "var(--radius-md)",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Code2 size={14} color="var(--blue)" />
              <span>{selectedStage.id === "ai-synthesis" ? "Gemini Bounded Diff Output" : "Stage Payload Log"}</span>
            </div>
            <span style={{ color: "#34d399", fontSize: "0.6875rem" }}>LIVE EVIDENCE</span>
          </div>

          <div
            style={{
              flex: 1,
              background: "#080f1d",
              color: "#e2e8f0",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78125rem",
              padding: "1rem",
              borderBottomLeftRadius: "var(--radius-md)",
              borderBottomRightRadius: "var(--radius-md)",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              border: "1px solid #1e293b",
              borderTop: "none",
            }}
          >
            {selectedStage.details.codeSnippet || `// [STAGE ${selectedStage.number}] Telemetry stream active.\n// Memory footprint: 42MB\n// Sandbox exit code: 0 (OK)\n// Telemetry committed to Neon Postgres table: migration_runs`}
          </div>

          {/* Quick Action */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <a
              href="https://github.com/demo-org/demo-checkout/pull/101"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary btn-sm"
              style={{ gap: "6px" }}
            >
              <span>Inspect Remote PR</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

