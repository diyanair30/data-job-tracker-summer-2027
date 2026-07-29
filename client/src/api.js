const BASE = "/api";

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function getJobs(refresh = false) {
  return fetch(`${BASE}/jobs${refresh ? "?refresh=true" : ""}`).then(handle);
}

export function getApplications() {
  return fetch(`${BASE}/applications`).then(handle);
}

export function getStatusOptions() {
  return fetch(`${BASE}/status-options`).then(handle);
}

export function createApplication(payload) {
  return fetch(`${BASE}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function updateApplication(id, fields) {
  return fetch(`${BASE}/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  }).then(handle);
}

export function deleteApplication(id) {
  return fetch(`${BASE}/applications/${id}`, { method: "DELETE" }).then(handle);
}
