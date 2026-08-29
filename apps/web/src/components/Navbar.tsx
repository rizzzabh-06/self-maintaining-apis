import React from "react";
import { ShieldCheck, GitPullRequest, Activity, Boxes, AlertTriangle, FolderGit2, Sliders, Sparkles } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenOnboarding: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenOnboarding }) => {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "repositories", label: "Repositories", icon: FolderGit2 },
    { id: "inventory", label: "API Inventory", icon: Boxes },
    { id: "changes", label: "Breaking Changes", icon: AlertTriangle },
    { id: "impact", label: "Impact Analysis", icon: ShieldCheck },
    { id: "migration", label: "Migration Console", icon: GitPullRequest },
    { id: "settings", label: "Settings", icon: Sliders },
  ];

  return (
    <header style={{
      borderBottom: "1px solid var(--border-subtle)",
      background: "rgba(8, 12, 20, 0.85)",
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
        <nav style={{ display: "flex", gap: "4px" }}>
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
                  gap: "7px",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "0.83rem",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  background: isActive ? "rgba(99, 102, 241, 0.18)" : "transparent",
                  border: isActive ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={15} color={isActive ? "var(--accent-cyan)" : "currentColor"} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Quick Actions & Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button 
            className="btn-primary" 
            onClick={onOpenOnboarding}
            style={{ padding: "7px 14px", fontSize: "0.78rem" }}
          >
            <Sparkles size={14} />
            <span>9-Step Setup Wizard</span>
          </button>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            background: "rgba(16, 185, 129, 0.1)",
            padding: "5px 10px",
            borderRadius: "20px",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            fontSize: "0.72rem",
            color: "#34d399",
            fontWeight: 600,
          }}>
            <span className="pulse-dot" />
            <span>Neon Postgres</span>
          </div>
        </div>
      </div>
    </header>
  );
};
