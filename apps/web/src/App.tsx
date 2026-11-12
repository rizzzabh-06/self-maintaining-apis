import { useState, useEffect, lazy, Suspense } from "react";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { Repositories } from "./pages/Repositories";
import { Inventory } from "./pages/Inventory";
import { Changes } from "./pages/Changes";
import { Impact } from "./pages/Impact";
import { Migration } from "./pages/Migration";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { eventStream } from "./api/events";
import { Loader2, Zap } from "lucide-react";

// Code-split secondary pages to optimize initial bundle load
const Analytics = lazy(() => import("./pages/Analytics").then(m => ({ default: m.Analytics })));
const MigrationHistory = lazy(() => import("./pages/MigrationHistory").then(m => ({ default: m.MigrationHistory })));
const ValidationDetails = lazy(() => import("./pages/ValidationDetails").then(m => ({ default: m.ValidationDetails })));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard").then(m => ({ default: m.ProviderDashboard })));
const SpecFeeds = lazy(() => import("./pages/SpecFeeds").then(m => ({ default: m.SpecFeeds })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px", color: "var(--blue)" }}>
      <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [liveNotification, setLiveNotification] = useState<{ message: string; type: string } | null>(null);

  // Connect to live FastAPI SSE Stream
  useEffect(() => {
    eventStream.connect("/api/events/stream");

    const unsubscribeConnection = eventStream.onConnectionChange((connected) => {
      setRealtimeConnected(connected);
    });

    const unsubscribeWebhook = eventStream.on("webhook_received", (data) => {
      setLiveNotification({
        type: "webhook",
        message: `Webhook received: ${data.data?.event || "change event"} (${data.data?.provider || data.data?.source || "API"})`,
      });
      setTimeout(() => setLiveNotification(null), 6000);
    });

    const unsubscribeMigration = eventStream.on("migration_completed", (data) => {
      setLiveNotification({
        type: "migration",
        message: `Migration run completed: ${data.data?.status || "PASS"} (${data.data?.provider || "API"})`,
      });
      setTimeout(() => setLiveNotification(null), 6000);
    });

    const unsubscribeScan = eventStream.on("scan_completed", (data) => {
      setLiveNotification({
        type: "scan",
        message: `Scan finished: ${data.data?.name || "repo"} (${data.data?.usages_count || 0} usages mapped)`,
      });
      setTimeout(() => setLiveNotification(null), 6000);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeWebhook();
      unsubscribeMigration();
      unsubscribeScan();
      eventStream.disconnect();
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--frost)" }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenOnboarding={() => setShowOnboarding(true)}
        realtimeConnected={realtimeConnected}
      />

      {liveNotification && (
        <div
          className="animate-fade-up"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 100,
            background: "var(--ink)",
            color: "#ffffff",
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.8125rem",
            fontWeight: 600,
            border: "1px solid var(--border)",
          }}
        >
          <Zap size={14} color="var(--blue)" style={{ flexShrink: 0 }} />
          <span>{liveNotification.message}</span>
        </div>
      )}

      <main style={{ flex: 1 }}>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
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
