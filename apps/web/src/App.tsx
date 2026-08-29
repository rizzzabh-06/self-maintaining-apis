import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { Changes } from "./pages/Changes";
import { Impact } from "./pages/Impact";
import { Migration } from "./pages/Migration";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main style={{ flex: 1 }}>
        {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === "inventory" && <Inventory />}
        {activeTab === "changes" && <Changes />}
        {activeTab === "impact" && <Impact />}
        {activeTab === "migration" && <Migration />}
      </main>

      <footer style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "1.5rem 2rem",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.8rem",
        background: "rgba(8, 12, 20, 0.9)",
      }}>
        <div>
          Self-Maintaining API Agent • Powered by <strong style={{ color: "#34d399" }}>Neon Lakebase Postgres</strong> • Strict Human Review & Draft PR Gate
        </div>
      </footer>
    </div>
  );
}

export default App;
