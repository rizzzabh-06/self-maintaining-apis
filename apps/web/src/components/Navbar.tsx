import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  FolderGit2,
  Boxes,
  AlertTriangle,
  ShieldCheck,
  GitPullRequest,
  Sliders,
  Rss,
  Wifi,
  WifiOff,
  TrendingUp,
  Clock,
  CheckCircle2,
  Menu,
  X,
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
  { id: "analytics", label: "Analytics", icon: TrendingUp, shortcut: "9" },
  { id: "migration-history", label: "History", icon: Clock, shortcut: "0" },
  { id: "providers", label: "Providers", icon: Boxes, shortcut: "a" },
  { id: "validation-details", label: "Validation", icon: CheckCircle2, shortcut: "v" },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenOnboarding,
  realtimeConnected = false,
}) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      // digits 1-9, 0
      if ((e.key >= "1" && e.key <= "9") || e.key === "0") {
        e.preventDefault();
        const tab = tabs.find((t) => t.shortcut === e.key);
        if (tab) {
          setActiveTab(tab.id);
          setMobileOpen(false);
        }
      }
      // letter shortcuts: a → providers, v → validation-details
      if (key === "a" || key === "v") {
        e.preventDefault();
        const tab = tabs.find((t) => t.shortcut === key);
        if (tab) {
          setActiveTab(tab.id);
          setMobileOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTab]);

  const selectTab = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
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
            height: "60px",
            gap: "1rem",
          }}
        >
          {/* Brand */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flexShrink: 0 }}
            onClick={() => selectTab("dashboard")}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <GitPullRequest size={18} color="#ffffff" />
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: "0.9375rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
                API <span style={{ color: "var(--blue)" }}>Agent</span>
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--ink-light)", fontWeight: 500 }}>
                Self-Maintaining
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav
            ref={navRef}
            className="desktop-nav"
            style={{ gap: "2px", position: "relative", flex: 1, justifyContent: "center" }}
          >
            {/* Sliding indicator */}
            <div
              style={{
                position: "absolute",
                bottom: "-1px",
                height: "2px",
                background: "var(--blue)",
                borderRadius: "2px 2px 0 0",
                transition: "left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1)",
                left: indicatorStyle.left,
                width: indicatorStyle.width,
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
                    onClick={() => selectTab(tab.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 10px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.8125rem",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "var(--ink)" : "var(--ink-light)",
                      background: isActive ? "var(--blue-wash)" : "transparent",
                      border: "1px solid transparent",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                      fontFamily: "var(--font-sans)",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = "var(--ink)";
                        (e.currentTarget as HTMLElement).style.background = "var(--gray-50)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = "var(--ink-light)";
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }
                    }}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                  <div className="tooltip">
                    {tab.label} <span style={{ opacity: 0.6, fontSize: "0.68rem" }}>Cmd+{tab.shortcut}</span>
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
              <span>Setup Wizard</span>
            </button>

            {/* Realtime status */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: realtimeConnected ? "var(--success-wash)" : "var(--gray-50)",
                padding: "5px 10px",
                borderRadius: "var(--radius-full)",
                border: `1px solid ${realtimeConnected ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
                fontSize: "0.6875rem",
                color: realtimeConnected ? "#059669" : "var(--ink-light)",
                fontWeight: 600,
                transition: "all var(--transition-base)",
              }}
            >
              {realtimeConnected ? (
                <>
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#10B981",
                      display: "inline-block",
                    }}
                  />
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

            {/* Mobile Menu Hamburger Toggle */}
            <button
              className="btn-secondary mobile-nav-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ padding: "7px 10px", alignItems: "center", justifyContent: "center" }}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="mobile-drawer-overlay animate-fade-in" onClick={() => setMobileOpen(false)}>
          <div className="mobile-drawer-content animate-slide-down" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--ink-light)", marginBottom: "8px", letterSpacing: "0.06em" }}>
              Navigation Menu
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "6px" }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => selectTab(tab.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.8125rem",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "var(--ink)" : "var(--ink-medium)",
                      background: isActive ? "var(--blue-wash)" : "var(--gray-50)",
                      border: `1px solid ${isActive ? "var(--blue)" : "var(--border)"}`,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Icon size={16} color={isActive ? "var(--blue)" : "var(--ink-light)"} />
                      <span>{tab.label}</span>
                    </div>
                    <span style={{ fontSize: "0.6875rem", color: "var(--gray-400)", fontWeight: 600 }}>
                      ⌘{tab.shortcut.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
