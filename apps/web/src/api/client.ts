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

export async function fetchGitHubRepositories() {
  const res = await fetch(`${API_BASE}/api/repositories/github`);
  return res.json();
}

export async function fetchConnectedRepositories() {
  const res = await fetch(`${API_BASE}/api/repositories`);
  return res.json();
}

export const fetchRepositories = fetchConnectedRepositories;

export async function connectRepository(githubRepo: string, name?: string) {
  const res = await fetch(`${API_BASE}/api/repositories/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ github_repo: githubRepo, name }),
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

export async function triggerMigration(provider: string = "fakepay", repoName: string = "demo-org/demo-checkout") {
  const res = await fetch(`${API_BASE}/api/migrations/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      repo_name: repoName,
      create_draft_pr: true,
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
