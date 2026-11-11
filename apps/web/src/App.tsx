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
import { Analytics } from "./pages/Analytics";
import { MigrationHistory } from "./pages/MigrationHistory";
import { ValidationDetails } from "./pages/ValidationDetails";
import { ProviderDashboard } from "./pages/ProviderDashboard";
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--frost)" }}>
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
        {activeTab === "analytics" && <Analytics onNavigate={setActiveTab} />}
        {activeTab === "migration-history" && <MigrationHistory />}
        {activeTab === "validation-details" && <ValidationDetails />}
        {activeTab === "providers" && <ProviderDashboard />}
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
          borderTop: "1px solid var(--border)",
          padding: "1rem 2rem",
          textAlign: "center",
          color: "var(--ink-light)",
          fontSize: "0.75rem",
          background: "var(--white)",
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
            background: realtimeConnected ? "var(--success)" : "var(--gray-300)",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        Self-Maintaining API Agent &nbsp;&middot;&nbsp;{" "}
        <strong style={{ color: "var(--ink-medium)" }}>Neon Lakebase Postgres</strong>
        &nbsp;&middot;&nbsp; Gemini LLM &nbsp;&middot;&nbsp; Tree-sitter AST &nbsp;&middot;&nbsp; Strict Draft PR Invariant
      </footer>
    </div>
  );
}

export default App;
