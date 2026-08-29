/** API client for the FastAPI backend. */

const API_BASE = import.meta.env.VITE_API_URL || "";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchProviders() {
  const res = await fetch(`${API_BASE}/api/inventory/providers`);
  return res.json();
}

export async function fetchRepositories() {
  const res = await fetch(`${API_BASE}/api/inventory/repositories`);
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
