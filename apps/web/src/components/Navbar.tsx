import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  FolderGit2,
  Boxes,
  AlertTriangle,
  ShieldCheck,
  GitPullRequest,
  Sliders,
  Sparkles,
  Rss,
  Wifi,
  WifiOff,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenOnboarding: () => void;
  realtimeConnected?: boolean;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: Activity, shortcut: "1" },
  { id: "repositories", label: "Repositories", icon: FolderGit2, shortcut: "2" },
  { id: "inventory", label: "API Inventory", icon: Boxes, shortcut: "3" },
  { id: "changes", label: "Breaking Changes", icon: AlertTriangle, shortcut: "4" },
  { id: "impact", label: "Impact", icon: ShieldCheck, shortcut: "5" },
  { id: "migration", label: "Migration Console", icon: GitPullRequest, shortcut: "6" },
  { id: "specfeeds", label: "Spec Feeds", icon: Rss, shortcut: "7" },
  { id: "settings", label: "Settings", icon: Sliders, shortcut: "8" },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenOnboarding,
  realtimeConnected = false,
}) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Sliding active indicator
  useEffect(() => {
    const el = buttonRefs.current.get(activeTab);
    if (el && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicatorStyle({
        left: elRect.left - navRect.left,
        width: elRect.width,
      });
    }
  }, [activeTab]);

  // Keyboard shortcuts (⌘ + number)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "8") {
        e.preventDefault();
        const tab = tabs.find((t) => t.shortcut === e.key);
        if (tab) setActiveTab(tab.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTab]);

  return (
    <header
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(6, 10, 18, 0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "0 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
          gap: "1.5rem",
        }}
      >
        {/* Brand */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flexShrink: 0 }}
          onClick={() => setActiveTab("dashboard")}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #6366f1, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 18px rgba(99,102,241,0.6)",
              flexShrink: 0,
            }}
          >
            <GitPullRequest size={20} color="#ffffff" />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#ffffff" }}>
              API <span style={{ color: "var(--accent-cyan)" }}>Agent</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Self-Maintaining • Autonomous
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          ref={navRef}
          style={{ display: "flex", gap: "2px", position: "relative", flex: 1, justifyContent: "center" }}
        >
          {/* Sliding indicator */}
          <div
            style={{
              position: "absolute",
              bottom: "-1px",
              height: "2px",
              background: "linear-gradient(90deg, var(--accent-indigo), var(--accent-cyan))",
              borderRadius: "2px 2px 0 0",
              transition: "left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1)",
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              boxShadow: "0 0 12px rgba(99,102,241,0.6)",
            }}
          />

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <div key={tab.id} className="tooltip-wrap">
                <button
                  ref={(el) => {
                    if (el) buttonRefs.current.set(tab.id, el);
                  }}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "7px",
                    fontSize: "0.8rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#ffffff" : "var(--text-muted)",
                    background: isActive ? "rgba(99,102,241,0.14)" : "transparent",
                    border: "1px solid transparent",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    fontFamily: "var(--font-sans)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
                <div className="tooltip">
                  {tab.label} <span style={{ opacity: 0.5, fontSize: "0.7rem" }}>⌘{tab.shortcut}</span>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <button
            className="btn-primary"
            onClick={onOpenOnboarding}
            style={{ padding: "7px 14px", fontSize: "0.78rem" }}
          >
            <Sparkles size={13} />
            <span>Setup Wizard</span>
          </button>

          {/* Realtime status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: realtimeConnected
                ? "rgba(16,185,129,0.08)"
                : "rgba(255,255,255,0.04)",
              padding: "5px 10px",
              borderRadius: "var(--radius-full)",
              border: `1px solid ${realtimeConnected ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`,
              fontSize: "0.7rem",
              color: realtimeConnected ? "#34d399" : "var(--text-muted)",
              fontWeight: 600,
              transition: "all var(--transition-base)",
            }}
          >
            {realtimeConnected ? (
              <>
                <span className="pulse-dot" style={{ width: "6px", height: "6px" }} />
                <Wifi size={11} />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff size={11} />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
