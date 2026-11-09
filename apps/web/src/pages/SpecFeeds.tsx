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
  connected: { color: "var(--success)", label: "Connected", dotColor: "var(--success)" },
  polling: { color: "var(--blue)", label: "Polling...", dotColor: "var(--blue)" },
  error: { color: "var(--error)", label: "Error", dotColor: "var(--error)" },
  idle: { color: "var(--ink-light)", label: "Idle", dotColor: "var(--gray-400)" },
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
  change: { badge: "badge-critical", dot: "var(--error)" },
  stable: { badge: "badge-success", dot: "var(--success)" },
  fetch: { badge: "badge-info", dot: "var(--blue)" },
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
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      {/* Header */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}
      >
        <div className="animate-fade-up">
          <div className="section-eyebrow" style={{ color: "var(--blue)" }}>
            <Rss size={15} />
            Continuous Spec Monitoring
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)", margin: 0 }}>
            Spec Feeds
          </h1>
          <p style={{ color: "var(--ink-light)", fontSize: "0.95rem", marginTop: "8px", maxWidth: "800px" }}>
            Connect to APIs.guru and npm RSS feeds for real-time upstream spec change detection.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ fontSize: "0.88rem", padding: "10px 18px" }}>
          <Plus size={15} />
          Add Feed
        </button>
      </div>

      {/* Stats row */}
      <div
        className="stagger"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}
      >
        {[
          { label: "Active Feeds", value: feeds.filter((f) => f.status !== "error").length, color: "var(--blue)", icon: Rss },
          { label: "Changes Detected", value: changesDetected, color: "var(--error)", icon: AlertTriangle },
          { label: "Providers Tracked", value: feeds.length, color: "var(--ink)", icon: Activity },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="card card-interactive animate-fade-up"
              style={{ padding: "1.5rem" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-light)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {s.label}
                </span>
                <div style={{ padding: "6px", borderRadius: "var(--radius-sm)", background: "var(--frost)", color: s.color, border: "1px solid var(--border)" }}>
                  <Icon size={14} />
                </div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: s.color, letterSpacing: "-0.03em" }}>
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem" }}>
        {/* Feed Cards */}
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {feeds.map((feed) => {
            const Icon = TYPE_ICON[feed.type] || Rss;
            const sc = STATUS_CONFIG[feed.status];
            const isPoll = pollingId === feed.id;
            return (
              <div
                key={feed.id}
                className="card card-interactive animate-fade-up"
                style={{
                  padding: "1.5rem",
                  borderLeft: feed.changeDetected ? "4px solid var(--error)" : "4px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--frost)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--blue)",
                        border: "1px solid var(--border)",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>
                        {feed.name}
                      </div>
                      {feed.provider && (
                        <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", marginTop: "2px" }}>
                          {feed.provider}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {feed.changeDetected && (
                      <span className="badge badge-critical" style={{ fontSize: "0.68rem" }}>
                        <AlertTriangle size={10} style={{ marginRight: "3px" }} /> Change Detected
                      </span>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "var(--frost)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-full)",
                        padding: "3px 10px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: sc.color,
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: sc.dotColor,
                        }}
                      />
                      {sc.label}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1.25rem",
                    fontSize: "0.82rem",
                    color: "var(--ink-medium)",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--ink-light)" }}>URL: </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>{feed.url}</span>
                  </div>
                  {feed.specVersion && (
                    <div>
                      <span style={{ color: "var(--ink-light)" }}>Version: </span>
                      <span style={{ fontWeight: 600, color: feed.changeDetected ? "var(--error)" : "var(--success)" }}>
                        {feed.specVersion}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.78rem", color: "var(--ink-light)", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={12} />
                    Last fetched: <strong style={{ color: "var(--ink-medium)", fontWeight: 600 }}>{feed.lastFetched || "Never"}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <RefreshCw size={12} />
                    Next poll: <strong style={{ color: "var(--ink-medium)", fontWeight: 600 }}>{feed.nextPoll || "—"}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <button
                    className="btn-secondary"
                    onClick={() => handlePoll(feed.id)}
                    disabled={isPoll}
                    style={{ fontSize: "0.78rem", padding: "6px 12px" }}
                  >
                    <RefreshCw size={12} className={isPoll ? "animate-spin" : ""} />
                    {isPoll ? "Polling..." : "Poll Now"}
                  </button>
                  <a
                    href={feed.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                    style={{ fontSize: "0.78rem", textDecoration: "none", padding: "6px 12px" }}
                  >
                    <ExternalLink size={12} />
                    Open Feed
                  </a>
                  <button
                    className="btn-ghost"
                    onClick={() => handleDelete(feed.id)}
                    style={{ marginLeft: "auto", color: "var(--error)", fontSize: "0.78rem", padding: "6px 10px" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Event log */}
        <div className="card" style={{ padding: "1.75rem", height: "fit-content", position: "sticky", top: "84px" }}>
          <h2
            style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Activity size={16} color="var(--blue)" />
            Spec Change Events
          </h2>
          <div className="activity-feed stagger">
            {MOCK_EVENTS.map((ev, idx) => {
              const ks = KIND_STYLES[ev.kind];
              return (
                <div key={idx} className="activity-item animate-fade-up">
                  <div
                    className="activity-dot"
                    style={{ background: ks.dot }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)" }}>
                        {ev.provider}
                      </span>
                      <span className={`badge ${ks.badge}`} style={{ fontSize: "0.65rem" }}>
                        {ev.kind}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-light)" }}>
                        {ev.version}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-medium)", lineHeight: 1.5 }}>
                      {ev.desc}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--ink-light)", marginTop: "4px" }}>
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
            className="card modal-content"
            style={{ width: "100%", maxWidth: "500px", padding: "2rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 6px 0" }}>Add Spec Feed</h3>
            <p style={{ color: "var(--ink-light)", fontSize: "0.88rem", margin: "0 0 1.5rem 0" }}>
              Connect a new OpenAPI URL, APIs.guru provider, or npm RSS feed for continuous monitoring.
            </p>

            <div style={{ display: "grid", gap: "14px", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
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
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
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
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
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

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn-secondary" onClick={() => setShowAddModal(false)} style={{ padding: "8px 16px" }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAdd} disabled={!newFeedUrl || !newFeedName} style={{ padding: "8px 16px" }}>
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

