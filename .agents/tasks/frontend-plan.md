# Frontend Tracking & Visualization Implementation Plan

## Overview
Build comprehensive frontend tracking and visualization features for the Self-Maintaining APIs system. This plan decomposes the work into 4 sequenced features covering component infrastructure, API client extensions, dashboard enhancements, and new pages with routing.

**Worktree path**: `/Users/rishabhrajsingh/Desktop/self-maintaining-apis/`

**Task artifacts**: `/Users/rishabhrajsingh/Desktop/self-maintaining-apis/.agents/tasks/frontend-tracking-visualization/`

---

## Feature Breakdown

### FEAT-001: Chart Components & Reusable Visualization Infrastructure
**Type**: feat  
**Dependencies**: None (installs recharts first)

Install recharts library and create 7 reusable visualization components following existing glassmorphism patterns.

**Components to create**:
- `TrendLineChart.tsx` - Line chart wrapper for time-series data
- `SuccessRatePieChart.tsx` - Pie chart for migration outcomes
- `RepositoryBarChart.tsx` - Bar chart for repository impact ranking
- `ConfidenceGauge.tsx` - Circular SVG gauge (no external deps)
- `LivePipelineMonitor.tsx` - Real-time polling progress component
- `MigrationCard.tsx` - Compact migration info card
- `ValidationResults.tsx` - Collapsible test output viewer with diff highlighting

**Key decisions**:
- recharts exact version `2.15.3` to avoid breaking changes
- All charts use CSS variables from `index.css` (--accent-cyan, --accent-indigo, etc.)
- ConfidenceGauge uses pure SVG to avoid extra dependencies
- All components handle empty/null data gracefully with "No data available" messages
- Polling interval: 5s for LivePipelineMonitor (faster than page-level 30s)

**Files**: 7 new files in `apps/web/src/components/`, 1 modified `apps/web/package.json`

**Verification**: `npm run build` succeeds, `npm run lint` passes, manual render test with mock data

---

### FEAT-002: API Client Extensions
**Type**: feat  
**Dependencies**: None (extends existing client)

Add 4 new functions to `apps/web/src/api/client.ts` following the existing pattern (raw fetch, no error handling, callers handle errors).

**Functions to add**:
- `fetchAnalytics()` - GET /api/analytics - returns time-series and summary data
- `fetchMigrationHistory(filters?)` - GET /api/migrations with query params (provider, status, dateRange)
- `fetchValidationDetails(id)` - Alias for fetchValidation with semantic clarity
- `fetchProviderStatus()` - GET /api/inventory/providers with status enrichment

**Key decisions**:
- Query param building for filters uses URLSearchParams to handle encoding
- No error handling in client (consistent with existing pattern - fetchProviders, fetchRepositories)
- fetchValidationDetails wraps existing fetchValidation for semantic clarity on ValidationDetails page

**Files**: 1 modified `apps/web/src/api/client.ts`

**Verification**: `npm run build` succeeds, manual API test in browser console with backend running

---

### FEAT-003: Enhanced Dashboard with Charts & Interactivity
**Type**: feat  
**Dependencies**: FEAT-001 (chart components), FEAT-002 (API functions)

Enhance `Dashboard.tsx` with 4 new metric cards, 3 recharts visualizations, provider status grid, and clickable pipeline steps with popover.

**Additions**:
- 4 new metric cards: Migrations Total, Success Rate %, Avg Validation Time, PRs Awaiting Review
- 3 charts: Breaking Changes (line), Migration Outcomes (pie), Top 5 Repos (bar)
- Provider status grid for FakePay and Stripe with health indicators
- Clickable pipeline steps showing detail popover (modal-overlay from index.css)

**Key decisions**:
- New metrics added to existing stats state with mock fallbacks
- Charts section placed after existing main content grid (before GitHub Draft PR section equivalent)
- Provider status grid uses pulse-dot animation for health indicators
- Pipeline step popover uses modal-overlay class with ESC key to close
- All data fetching uses .catch() fallbacks to mock data for resilience

**Files**: 1 modified `apps/web/src/pages/Dashboard.tsx`

**Verification**: `npm run dev`, verify 8 cards render, charts display, pipeline steps clickable, works without backend

---

### FEAT-004: New Pages & App Routing
**Type**: feat  
**Dependencies**: FEAT-001 (components), FEAT-002 (API client)

Create 4 new pages with full routing through App.tsx and Navbar.tsx.

**Pages to create**:
1. **MigrationHistory.tsx** - Searchable/filterable table with expandable rows and CSV export
   - Uses data-table class, MigrationCard for expanded view
   - CSV export via Blob download (no library)
   - Filters: provider, status, dateRange with URLSearchParams

2. **Analytics.tsx** - Multi-section dashboard with 5 chart areas
   - Time range selector (7d/30d/90d)
   - Breaking Changes Trend, Success Rate, Provider Rankings, Validation Time, Activity Heatmap
   - Uses all chart components from FEAT-001

3. **ValidationDetails.tsx** - Full validation viewer with logs and diff highlighting
   - Props: optional validationId (if none, show recent list)
   - ValidationResults component, diff-container, terminal-style logs
   - Link to GitHub PR with ExternalLink icon

4. **ProviderDashboard.tsx** - Multi-provider grid with detail drill-down
   - Provider cards grid (glass-panel-interactive)
   - Detail panel: spec version timeline (pipeline-timeline style), breaking change history, webhook config
   - Click provider to select and show detail panel

**Routing wiring**:
- App.tsx: import 4 pages, add 4 routing cases for activeTab values
- Navbar.tsx: add 4 new tabs with icons and shortcuts (⌘9, ⌘0, ⌘A, ⌘V)
- Update keyboard handler to support numeric and letter shortcuts

**Key decisions**:
- ValidationDetails supports both direct navigation (validationId in state) and list view
- CSV export uses native Blob API, no csv-parse dependency
- Provider timeline uses vertical layout with pipeline-step styling adapted
- All pages poll every 30s (same as Dashboard)
- Tab IDs: 'analytics', 'migration-history', 'providers', 'validation-details'

**Files**: 4 new pages in `apps/web/src/pages/`, 2 modified (App.tsx, Navbar.tsx)

**Verification**: `npm run build`, `npm run dev`, test all tabs load, keyboard shortcuts work, CSV export downloads, mobile responsive

---

## Implementation Order & Dependencies

```
FEAT-001 (Components & recharts)
    ↓
FEAT-002 (API Client)
    ↓
FEAT-003 (Dashboard Enhancement) ← depends on FEAT-001, FEAT-002
    ↓
FEAT-004 (New Pages & Routing) ← depends on FEAT-001, FEAT-002
```

**Sequential execution required** - each feature builds on previous. No parallel work due to shared worktree and import dependencies.

---

## Data Shapes & Mock Data

### Analytics API Response (fetchAnalytics)
```typescript
{
  breaking_changes_trend: Array<{date: string, count: number}>, // last 30 days
  migration_outcomes: {success: number, failed: number, in_progress: number},
  top_repos: Array<{repo: string, count: number}>, // top 5
  avg_validation_time: number, // seconds
  migrations_total: number,
  prs_awaiting: number
}
```

### Migration History Response (fetchMigrationHistory)
```typescript
Array<{
  id: string,
  timestamp: string,
  provider: string,
  repo_name: string,
  status: 'completed' | 'failed' | 'in_progress',
  confidence: number, // 0-100
  pr_url: string | null
}>
```

### Provider Status Response (fetchProviderStatus)
```typescript
Array<{
  name: string,
  current_version: string,
  health: 'healthy' | 'degraded' | 'down',
  last_checked: string,
  webhook_status: 'connected' | 'disconnected',
  breaking_changes_count: number,
  spec_versions: Array<{version: string, date: string, breaking_count: number}>
}>
```

### Validation Details Response (fetchValidationDetails)
```typescript
{
  id: string,
  migration_id: string,
  status: 'pass' | 'fail',
  build_logs: string,
  test_results: {passed: number, failed: number, tests: Array<{name: string, status: string}>},
  contract_checks: Array<{check: string, passed: boolean, diff?: string}>,
  pr_url: string | null,
  timestamp: string
}
```

---

## Risks & Gotchas

1. **Backend API endpoints may not exist yet**
   - Mitigation: All components gracefully fall back to mock data when API returns 404 or network error
   - Pattern: `.catch(() => MOCK_DATA)` in every fetch

2. **recharts bundle size**
   - recharts is ~400KB minified - acceptable for this use case
   - Tree-shaking via named imports keeps production bundle smaller

3. **No react-router means programmatic navigation is limited**
   - ValidationDetails page needs special handling: when opened from another page (e.g., click migration in history), we set activeTab and pass validationId via callback/state
   - Alternative: use query params in URL (not implemented in existing app)

4. **CSV export works only with simple data**
   - Current implementation handles flat objects (string/number values)
   - Nested objects or arrays need JSON.stringify or custom formatting

5. **Polling with 30s interval can miss rapid changes**
   - LivePipelineMonitor uses 5s for faster feedback on running migrations
   - Consider adding manual refresh button for user control

6. **No authentication/session handling in API client**
   - Existing client doesn't handle auth - assumes same-origin or public endpoints
   - If auth is added later, need to update all fetch calls

7. **Keyboard shortcuts conflict risk**
   - New shortcuts (9, 0, A, V) might conflict with browser/OS shortcuts
   - Users can always click tabs instead

8. **Mobile chart rendering**
   - recharts ResponsiveContainer handles resize, but legends may wrap awkwardly
   - Test on mobile breakpoints (<768px) and adjust legend position if needed

---

## CSS Classes Used (from index.css)

- `glass-panel` - glassmorphism card backgrounds
- `glass-panel-interactive` - hover effects with transform
- `btn-primary`, `btn-secondary`, `btn-ghost` - button styles
- `badge-*` - status badges (success, critical, warning, info, purple, indigo)
- `data-table` - table layouts with hover states
- `diff-line-*` - syntax highlighted diff lines (add, del, ctx, hunk)
- `modal-overlay`, `modal-content` - modal/popover overlays
- `pipeline-timeline`, `pipeline-step`, `pipeline-step-dot` - timeline components
- `activity-feed`, `activity-item`, `activity-dot` - activity stream
- `pulse-dot` - animated status indicators
- `skeleton`, `skeleton-text` - loading states
- `animate-fade-up`, `animate-fade-in`, `stagger` - entrance animations
- `section-eyebrow` - section headers

---

## Verification Checklist

After all features complete:

- [ ] `cd apps/web && npm run build` succeeds with no TypeScript errors
- [ ] `cd apps/web && npm run lint` passes with no warnings
- [ ] `npm run dev` starts dev server on port 5173
- [ ] All 12 navbar tabs render (8 existing + 4 new)
- [ ] Keyboard shortcuts ⌘1-8 work for existing tabs
- [ ] Keyboard shortcuts ⌘9, ⌘0, ⌘A, ⌘V navigate to new tabs
- [ ] Dashboard shows 8 metric cards (4 existing + 4 new)
- [ ] Dashboard displays 3 charts with mock data
- [ ] Dashboard provider grid shows FakePay and Stripe
- [ ] Clicking pipeline step shows popover with details
- [ ] Analytics page loads with 5 chart sections
- [ ] Migration History page shows table and CSV export works
- [ ] Validation Details page loads (handles no validationId)
- [ ] Provider Dashboard page shows provider grid and detail panel
- [ ] All pages work without backend (mock data fallbacks)
- [ ] All pages work with backend unavailable (no console errors, graceful degradation)
- [ ] Mobile responsive: cards wrap, charts resize, navbar collapses (if applicable)
- [ ] Browser console has no errors or warnings
- [ ] All interactive elements have aria-labels or aria-describedby

---

## Future Enhancements (Out of Scope)

- WebSocket/SSE for real-time updates instead of polling
- Virtualized tables for large datasets (react-window)
- Chart export as PNG/SVG
- Advanced filters with date pickers and multi-select
- Saved filter presets
- User preferences for chart colors and layout
- Dark/light mode toggle (currently always dark)
- Internationalization (i18n)
- Unit tests for components (Vitest + React Testing Library)
- E2E tests (Playwright)

---

## Component API Reference

### TrendLineChart Props
```typescript
interface TrendLineChartProps {
  data: Array<{date: string; count: number}>;
  title?: string;
  height?: number; // default 280
  dataKey?: string; // default 'count'
  strokeColor?: string; // default 'var(--accent-cyan)'
}
```

### SuccessRatePieChart Props
```typescript
interface SuccessRatePieChartProps {
  data: Array<{name: string; value: number; color: string}>;
  title?: string;
  height?: number; // default 260
}
```

### RepositoryBarChart Props
```typescript
interface RepositoryBarChartProps {
  data: Array<{repo: string; count: number}>;
  title?: string;
  height?: number; // default 300
  barColor?: string; // default 'var(--accent-indigo)'
}
```

### ConfidenceGauge Props
```typescript
interface ConfidenceGaugeProps {
  value: number; // 0-100
  size?: number; // default 120
  label?: string;
  strokeWidth?: number; // default 8
}
```

### LivePipelineMonitor Props
```typescript
interface LivePipelineMonitorProps {
  migrationId: string;
  onComplete?: () => void;
  pollInterval?: number; // default 5000ms
}
```

### MigrationCard Props
```typescript
interface MigrationCardProps {
  migration: {
    id: string;
    provider: string;
    status: 'completed' | 'failed' | 'in_progress';
    timestamp: string;
    confidence: number;
    repoName: string;
    prUrl?: string;
  };
  onClick?: () => void;
  compact?: boolean; // default false
}
```

### ValidationResults Props
```typescript
interface ValidationResultsProps {
  validationData: {
    build_logs?: string;
    test_results?: {
      passed: number;
      failed: number;
      tests: Array<{name: string; status: string; message?: string}>;
    };
    contract_checks?: Array<{check: string; passed: boolean; diff?: string}>;
  } | null;
}
```

---

**Plan complete. Ready for sequential implementation via FEAT-001 → FEAT-002 → FEAT-003 → FEAT-004.**
