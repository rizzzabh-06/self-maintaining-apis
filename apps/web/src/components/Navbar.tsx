import React from "react";
import { Database, ShieldCheck, GitPullRequest, Activity, Boxes, AlertTriangle } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "inventory", label: "API Inventory", icon: Boxes },
    { id: "changes", label: "Breaking Changes", icon: AlertTriangle },
    { id: "impact", label: "Impact Analysis", icon: ShieldCheck },
    { id: "migration", label: "Migration Console", icon: GitPullRequest },
  ];

  return (
    <header style={{
      borderBottom: "1px solid var(--border-subtle)",
      background: "rgba(8, 12, 20, 0.8)",
      backdropFilter: "blur(20px)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      padding: "0 2rem",
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "70px",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => setActiveTab("dashboard")}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 15px rgba(99, 102, 241, 0.5)",
          }}>
            <GitPullRequest size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#ffffff" }}>
              Antigravity <span style={{ color: "var(--accent-cyan)" }}>API Agent</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Self-Maintaining APIs • Draft PR Automation
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", gap: "6px" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  background: isActive ? "rgba(99, 102, 241, 0.18)" : "transparent",
                  border: isActive ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={16} color={isActive ? "var(--accent-cyan)" : "currentColor"} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(16, 185, 129, 0.1)",
            padding: "5px 12px",
            borderRadius: "20px",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            fontSize: "0.75rem",
            color: "#34d399",
            fontWeight: 600,
          }}>
            <span className="pulse-dot" />
            <span>Neon Lakebase Postgres</span>
          </div>
        </div>
      </div>
    </header>
  );
};
