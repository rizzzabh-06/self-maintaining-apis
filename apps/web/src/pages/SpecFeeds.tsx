import { useState } from "react";
import {
  Rss,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Activity,
  Globe,
  Package,
} from "lucide-react";

type FeedStatus = "connected" | "polling" | "error" | "idle";

type Feed = {
  id: string;
  name: string;
  type: "apis_guru" | "npm_rss" | "openapi_url";
  url: string;
  provider?: string;
  lastFetched?: string;
  nextPoll?: string;
  changeDetected?: boolean;
  status: FeedStatus;
  specVersion?: string;
};

const DEFAULT_FEEDS: Feed[] = [
  {
    id: "1",
    name: "APIs.guru Catalog",
    type: "apis_guru",
    url: "https://api.apis.guru/v2/list.json",
    provider: "Multiple (2000+ providers)",
    lastFetched: "2 min ago",
    nextPoll: "in 3 min",
    changeDetected: true,
    status: "connected",
    specVersion: "FakePay v2.0.0 detected",
  },
  {
    id: "2",
    name: "Stripe Changelog RSS",
    type: "npm_rss",
    url: "https://feeds.stripe.com/changelog.rss",
    provider: "Stripe",
    lastFetched: "15 min ago",
    nextPoll: "in 45 min",
    changeDetected: false,
    status: "connected",
    specVersion: "stripe@14.12.0 (stable)",
  },
  {
    id: "3",
    name: "Twilio npm RSS",
    type: "npm_rss",
    url: "https://feeds.npmjs.com/package/twilio",
    provider: "Twilio",
    lastFetched: "1 hr ago",
    nextPoll: "in 4 hr",
    changeDetected: false,
    status: "idle",
    specVersion: "twilio@5.3.1",
  },
];

const STATUS_CONFIG: Record<FeedStatus, { color: string; label: string; dotColor: string }> = {
  connected: { color: "#34d399", label: "Connected", dotColor: "#34d399" },
  polling: { color: "#818cf8", label: "Polling...", dotColor: "#818cf8" },
  error: { color: "#fb7185", label: "Error", dotColor: "#fb7185" },
  idle: { color: "#64748b", label: "Idle", dotColor: "#64748b" },
};

const TYPE_ICON = {
  apis_guru: Globe,
  npm_rss: Package,
  openapi_url: Rss,
};

type SpecEvent = {
  time: string;
  provider: string;
  version: string;
  kind: "change" | "stable" | "fetch";
  desc: string;
};

const MOCK_EVENTS: SpecEvent[] = [
  { time: "12:41", provider: "FakePay", version: "v2.0.0", kind: "change", desc: "Breaking: POST /payment renamed to /payments; currency now required" },
  { time: "12:38", provider: "Stripe", version: "14.12.0", kind: "stable", desc: "No breaking changes detected vs stored hash" },
  { time: "12:35", provider: "APIs.guru", version: "catalog", kind: "fetch", desc: "2,143 providers indexed — 1 new change detected" },
  { time: "11:20", provider: "Twilio", version: "5.3.1", kind: "stable", desc: "No breaking changes detected" },
];

const KIND_STYLES: Record<SpecEvent["kind"], { badge: string; dot: string }> = {
  change: { badge: "badge-critical", dot: "#fb7185" },
  stable: { badge: "badge-success", dot: "#34d399" },
  fetch: { badge: "badge-info", dot: "#818cf8" },
};

export const SpecFeeds: React.FC = () => {
  const [feeds, setFeeds] = useState<Feed[]>(DEFAULT_FEEDS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedType, setNewFeedType] = useState<Feed["type"]>("openapi_url");
  const [pollingId, setPollingId] = useState<string | null>(null);

  // Simulate a poll
  const handlePoll = async (id: string) => {
    setPollingId(id);
    setFeeds((prev) => prev.map((f) => (f.id === id ? { ...f, status: "polling" } : f)));
    await sleep(1800);
    setFeeds((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, status: "connected", lastFetched: "just now", nextPoll: "in 5 min" }
          : f
      )
    );
    setPollingId(null);
  };

  const handleAdd = () => {
    if (!newFeedUrl || !newFeedName) return;
    const feed: Feed = {
      id: Date.now().toString(),
      name: newFeedName,
      type: newFeedType,
      url: newFeedUrl,
      status: "idle",
      lastFetched: "Never",
      nextPoll: "Pending first poll",
    };
    setFeeds((prev) => [...prev, feed]);
    setShowAddModal(false);
    setNewFeedUrl("");
    setNewFeedName("");
  };

  const handleDelete = (id: string) => {
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  };

  const changesDetected = feeds.filter((f) => f.changeDetected).length;

  return (
    <div style={{ maxWidth: "1500px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}
      >
        <div className="animate-fade-up">
          <div className="section-eyebrow" style={{ color: "var(--accent-amber)" }}>
            <Rss size={16} />
            Continuous Spec Monitoring
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Spec Feeds</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "4px" }}>
            Connect to APIs.guru and npm RSS feeds for real-time upstream spec change detection.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ fontSize: "0.85rem" }}>
          <Plus size={15} />
          Add Feed
        </button>
      </div>

      {/* Stats row */}
      <div
        className="stagger"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}
      >
        {[
          { label: "Active Feeds", value: feeds.filter((f) => f.status !== "error").length, color: "var(--accent-cyan)", icon: Rss },
          { label: "Changes Detected", value: changesDetected, color: "#fb7185", icon: AlertTriangle },
          { label: "Providers Tracked", value: feeds.length, color: "#818cf8", icon: Activity },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="glass-panel glass-panel-interactive animate-fade-up"
              style={{ padding: "1.25rem" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.label}
                </span>
                <div style={{ padding: "6px", borderRadius: "7px", background: `${s.color}18`, color: s.color }}>
                  <Icon size={14} />
                </div>
              </div>
              <div style={{ fontSize: "1.9rem", fontWeight: 800, color: s.color, letterSpacing: "-0.03em" }}>
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem" }}>
        {/* Feed Cards */}
        <div style={{ display: "grid", gap: "1rem" }}>
          {feeds.map((feed) => {
            const Icon = TYPE_ICON[feed.type] || Rss;
            const sc = STATUS_CONFIG[feed.status];
            const isPoll = pollingId === feed.id;
            return (
              <div
                key={feed.id}
                className="glass-panel animate-fade-up"
                style={{
                  padding: "1.5rem",
                  borderLeft: feed.changeDetected ? "3px solid #fb7185" : "3px solid rgba(255,255,255,0.06)",
                  transition: "box-shadow var(--transition-base)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "rgba(245,158,11,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-amber)",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                        {feed.name}
                      </div>
                      {feed.provider && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {feed.provider}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {feed.changeDetected && (
                      <span className="badge badge-critical" style={{ fontSize: "0.65rem" }}>
                        <AlertTriangle size={9} /> Change Detected
                      </span>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        background: `${sc.dotColor}12`,
                        border: `1px solid ${sc.dotColor}30`,
                        borderRadius: "var(--radius-full)",
                        padding: "3px 9px",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: sc.color,
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: sc.dotColor,
                          boxShadow: `0 0 6px ${sc.dotColor}`,
                          animation: feed.status === "connected" ? "pulse 2s infinite" : "none",
                        }}
                      />
                      {sc.label}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    marginBottom: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>URL: </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>{feed.url}</span>
                  </div>
                  {feed.specVersion && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Version: </span>
                      <span style={{ fontWeight: 600, color: feed.changeDetected ? "#fb7185" : "#34d399" }}>
                        {feed.specVersion}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={11} />
                    Last fetched: <strong style={{ color: "var(--text-secondary)" }}>{feed.lastFetched || "Never"}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <RefreshCw size={11} />
                    Next poll: <strong style={{ color: "var(--text-secondary)" }}>{feed.nextPoll || "—"}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn-secondary"
                    onClick={() => handlePoll(feed.id)}
                    disabled={isPoll}
                    style={{ fontSize: "0.78rem" }}
                  >
                    <RefreshCw size={12} className={isPoll ? "animate-spin" : ""} />
                    {isPoll ? "Polling..." : "Poll Now"}
                  </button>
                  <a
                    href={feed.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                    style={{ fontSize: "0.78rem", textDecoration: "none" }}
                  >
                    <ExternalLink size={12} />
                    Open Feed
                  </a>
                  <button
                    className="btn-ghost"
                    onClick={() => handleDelete(feed.id)}
                    style={{ marginLeft: "auto", color: "#fb7185", fontSize: "0.78rem" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Event log */}
        <div className="glass-panel" style={{ padding: "1.75rem", height: "fit-content", position: "sticky", top: "84px" }}>
          <h2
            style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Activity size={16} color="var(--accent-cyan)" />
            Spec Change Events
          </h2>
          <div className="activity-feed stagger">
            {MOCK_EVENTS.map((ev, idx) => {
              const ks = KIND_STYLES[ev.kind];
              return (
                <div key={idx} className="activity-item animate-fade-up">
                  <div
                    className="activity-dot"
                    style={{ background: ks.dot, boxShadow: `0 0 6px ${ks.dot}` }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "3px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {ev.provider}
                      </span>
                      <span className={`badge ${ks.badge}`} style={{ fontSize: "0.6rem" }}>
                        {ev.kind}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "#818cf8" }}>
                        {ev.version}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.77rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {ev.desc}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px" }}>
                      Today at {ev.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Feed Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="glass-panel modal-content"
            style={{ width: "100%", maxWidth: "500px", padding: "2rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "4px" }}>Add Spec Feed</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Connect a new OpenAPI URL, APIs.guru provider, or npm RSS feed for continuous monitoring.
            </p>

            <div style={{ display: "grid", gap: "12px", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "5px" }}>
                  Feed Name
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Stripe OpenAPI"
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "5px" }}>
                  Feed Type
                </label>
                <select
                  className="input-field"
                  value={newFeedType}
                  onChange={(e) => setNewFeedType(e.target.value as Feed["type"])}
                  style={{ appearance: "none", cursor: "pointer" }}
                >
                  <option value="apis_guru">APIs.guru (OpenAPI spec catalog)</option>
                  <option value="npm_rss">npm RSS Feed</option>
                  <option value="openapi_url">Direct OpenAPI URL</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "5px" }}>
                  URL
                </label>
                <input
                  className="input-field"
                  placeholder="https://..."
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAdd} disabled={!newFeedUrl || !newFeedName}>
                <CheckCircle2 size={14} />
                Add Feed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
