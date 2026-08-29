import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { Repositories } from "./pages/Repositories";
import { Inventory } from "./pages/Inventory";
import { Changes } from "./pages/Changes";
import { Impact } from "./pages/Impact";
import { Migration } from "./pages/Migration";
import { Settings } from "./pages/Settings";
import { OnboardingWizard } from "./components/OnboardingWizard";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenOnboarding={() => setShowOnboarding(true)}
      />
      
      <main style={{ flex: 1 }}>
        {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === "repositories" && <Repositories />}
        {activeTab === "inventory" && <Inventory />}
        {activeTab === "changes" && <Changes />}
        {activeTab === "impact" && <Impact />}
        {activeTab === "migration" && <Migration />}
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

      <footer style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "1.5rem 2rem",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.8rem",
        background: "rgba(8, 12, 20, 0.9)",
      }}>
        <div>
          Self-Maintaining API Agent • Powered by <strong style={{ color: "#34d399" }}>Neon Lakebase Postgres</strong> • Gemini LLM Provider • Strict Draft PR Invariant
        </div>
      </footer>
    </div>
  );
}

export default App;
