import { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { Repositories } from "./pages/Repositories";
import { Inventory } from "./pages/Inventory";
import { Changes } from "./pages/Changes";
import { Impact } from "./pages/Impact";
import { Migration } from "./pages/Migration";
import { Settings } from "./pages/Settings";
import { SpecFeeds } from "./pages/SpecFeeds";
import { OnboardingWizard } from "./components/OnboardingWizard";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Simulate realtime connection status (will be replaced by Supabase client)
  useEffect(() => {
    const timer = setTimeout(() => setRealtimeConnected(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenOnboarding={() => setShowOnboarding(true)}
        realtimeConnected={realtimeConnected}
      />

      <main style={{ flex: 1 }}>
        {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === "repositories" && <Repositories />}
        {activeTab === "inventory" && <Inventory />}
        {activeTab === "changes" && <Changes />}
        {activeTab === "impact" && <Impact />}
        {activeTab === "migration" && <Migration />}
        {activeTab === "specfeeds" && <SpecFeeds />}
        {activeTab === "settings" && <Settings />}
      </main>

      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => {
            setShowOnboarding(false);
            setActiveTab("dashboard");
          }}
          onCancel={() => setShowOnboarding(false)}
        />
      )}

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "1.25rem 2rem",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.75rem",
          background: "rgba(6,10,18,0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: realtimeConnected ? "#34d399" : "#64748b",
            boxShadow: realtimeConnected ? "0 0 8px #34d399" : "none",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        Self-Maintaining API Agent &nbsp;•&nbsp;{" "}
        <strong style={{ color: "#34d399" }}>Neon Lakebase Postgres</strong>
        &nbsp;•&nbsp; Gemini LLM &nbsp;•&nbsp; Tree-sitter AST &nbsp;•&nbsp; Strict Draft PR Invariant
      </footer>
    </div>
  );
}

export default App;
