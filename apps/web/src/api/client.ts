/** API client for the FastAPI backend and Neon Lakebase Postgres. */

const API_BASE = import.meta.env.VITE_API_URL || "";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchSession() {
  const res = await fetch(`${API_BASE}/api/auth/session`);
  return res.json();
}

export async function fetchGitHubAuthorizeUrl() {
  const res = await fetch(`${API_BASE}/api/auth/github/authorize-url`);
  return res.json();
}

export async function connectGitHub(token?: string, accountLogin?: string) {
  const res = await fetch(`${API_BASE}/api/auth/github/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, account_login: accountLogin }),
  });
  return res.json();
}

export async function disconnectGitHub() {
  const res = await fetch(`${API_BASE}/api/auth/github/disconnect`, {
    method: "POST",
  });
  return res.json();
}

export async function fetchGitHubRepositories(search?: string, page: number = 1) {
  const url = search
    ? `${API_BASE}/api/repositories/github?search=${encodeURIComponent(search)}&page=${page}`
    : `${API_BASE}/api/repositories/github?page=${page}`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchConnectedRepositories() {
  const res = await fetch(`${API_BASE}/api/repositories`);
  return res.json();
}

export const fetchRepositories = fetchConnectedRepositories;

export async function connectRepository(
  githubRepo: string,
  name?: string,
  defaultBranch: string = "main",
  language: string = "TypeScript"
) {
  const res = await fetch(`${API_BASE}/api/repositories/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      github_repo: githubRepo,
      name,
      default_branch: defaultBranch,
      language,
    }),
  });
  return res.json();
}

export async function disconnectRepository(repositoryId: string) {
  const res = await fetch(`${API_BASE}/api/repositories/${encodeURIComponent(repositoryId)}`, {
    method: "DELETE",
  });
  return res.json();
}


export async function triggerRepositoryScan(repositoryId: string) {
  const res = await fetch(`${API_BASE}/api/repositories/${encodeURIComponent(repositoryId)}/scan`, {
    method: "POST",
  });
  return res.json();
}

export async function fetchAutomationSettings() {
  const res = await fetch(`${API_BASE}/api/automation`);
  return res.json();
}

export async function updateAutomationSettings(settings: {
  auto_scan_on_push: boolean;
  auto_pr_on_breaking: boolean;
  confidence_threshold: number;
}) {
  const res = await fetch(`${API_BASE}/api/automation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return res.json();
}

export async function fetchProviders() {
  const res = await fetch(`${API_BASE}/api/inventory/providers`);
  return res.json();
}

export async function fetchUsages(provider?: string) {
  const url = provider
    ? `${API_BASE}/api/inventory/usages?provider=${encodeURIComponent(provider)}`
    : `${API_BASE}/api/inventory/usages`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchChanges() {
  const res = await fetch(`${API_BASE}/api/changes`);
  return res.json();
}

export async function fetchImpact(provider: string = "fakepay") {
  const res = await fetch(`${API_BASE}/api/impact?provider=${encodeURIComponent(provider)}`);
  return res.json();
}

export async function triggerMigration(
  provider: string = "fakepay",
  repoName: string = "demo-org/demo-checkout",
  repositoryId?: string,
  publishToGithub: boolean = false,
  background: boolean = false
) {
  const res = await fetch(`${API_BASE}/api/migrations/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      repo_name: repoName,
      repository_id: repositoryId,
      create_draft_pr: true,
      publish_to_github: publishToGithub,
      background,
    }),
  });
  return res.json();
}

export async function fetchMigrations() {
  const res = await fetch(`${API_BASE}/api/migrations`);
  return res.json();
}

export async function fetchValidation(migrationId: string) {
  const res = await fetch(`${API_BASE}/api/validations/${encodeURIComponent(migrationId)}`);
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/api/analytics`);
  return res.json();
}

export async function fetchMigrationHistory(filters?: {
  provider?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.provider) params.set("provider", filters.provider);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/migrations${qs}`);
  return res.json();
}

export async function fetchValidationDetails(validationId: string) {
  return fetchValidation(validationId);
}

/** List recent validation runs — calls GET /api/validations */
export async function fetchValidationList(opts?: { limit?: number; status?: string }) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.status) params.set("status", opts.status);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/validations${qs}`);
  return res.json(); // { items: ValidationRun[], total: number }
}

/** Fetch a single provider by slug — GET /api/inventory/providers/:slug */
export async function fetchProviderBySlug(slug: string) {
  const res = await fetch(`${API_BASE}/api/inventory/providers/${encodeURIComponent(slug)}`);
  return res.json();
}

export async function fetchProviderStatus() {
  const res = await fetch(`${API_BASE}/api/inventory/providers`);
  return res.json(); // enriched provider list
}

