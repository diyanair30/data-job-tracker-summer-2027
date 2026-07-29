const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

let cache = { data: null, fetchedAt: 0 };

function isDataRole(title) {
  return /data/i.test(title);
}

// These trackers occasionally include full-time/grad-assistant roles
// alongside internships. Require "intern" in the title to filter those out
// (e.g. "Graduate Assistant - Data...", "Senior Data Governance Professional").
function isInternshipTitle(title) {
  return /intern/i.test(title);
}

// Degree isn't always tagged by the source. Only exclude a listing when it
// explicitly requires an advanced degree and does NOT accept Bachelor's —
// unlabeled/empty degree lists are kept (better to include than miss one).
function acceptsBachelors(degrees) {
  return !degrees || degrees.length === 0 || degrees.includes("Bachelor's");
}

// Sources sometimes link to the same posting with a trailing path segment
// difference (e.g. Ashby's job page vs. its "/application" variant).
// Normalize so those still dedupe against each other.
function urlDedupeKey(url) {
  return url ? url.replace(/\/(apply|application)\/?$/i, "").replace(/\/$/, "") : null;
}

// Terms show up as ["Summer 2026"], a bare season like "Fall", or "Fall 2026".
// Sources sometimes disagree on the same posting's term (one tags it Fall,
// another infers Summer). Only exclude when EVERY known term is out of
// scope (Fall/Co-op) — if any term suggests it's in scope, or terms are
// unlabeled, keep it, per the "keep if unsure" preference.
function isOutOfScope(terms) {
  return terms.length > 0 && terms.every((t) => /fall|co-?op/i.test(t));
}

async function fetchSimplify() {
  const res = await fetch(
    "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json"
  );
  if (!res.ok) throw new Error(`Failed to fetch Simplify listings: ${res.status}`);
  const raw = await res.json();
  return raw.map((job) => ({
    job_id: `simplify:${job.id}`,
    company: job.company_name,
    position: job.title,
    date_posted: job.date_posted
      ? new Date(job.date_posted * 1000).toISOString().slice(0, 10)
      : null,
    url: job.url,
    location: (job.locations || []).join("; "),
    terms: job.terms || [],
    degrees: job.degrees || [],
    active: job.active === true,
  }));
}

async function fetchVansh() {
  const res = await fetch(
    "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/.github/scripts/listings.json"
  );
  if (!res.ok) throw new Error(`Failed to fetch vanshb03 listings: ${res.status}`);
  const raw = await res.json();
  return raw.map((job) => ({
    job_id: `vanshb03:${job.id}`,
    company: job.company_name,
    position: job.title,
    date_posted: job.date_posted
      ? new Date(job.date_posted * 1000).toISOString().slice(0, 10)
      : null,
    url: job.url,
    location: (job.locations || []).join("; "),
    terms: job.season ? [job.season] : [],
    degrees: [],
    active: job.active === true,
  }));
}

async function fetchZshah101() {
  const res = await fetch(
    "https://raw.githubusercontent.com/zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships/main/data/jobs.json"
  );
  if (!res.ok) throw new Error(`Failed to fetch zshah101 listings: ${res.status}`);
  const raw = await res.json();
  return Object.values(raw).map((job) => ({
    job_id: `zshah101:${job.id}`,
    company: job.company,
    position: job.title,
    date_posted: job.posted_at ? job.posted_at.slice(0, 10) : null,
    url: job.url,
    location: job.location || "",
    terms: job.season ? [job.season] : [],
    degrees: [],
    active: job.is_open === true,
  }));
}

const SOURCES = [fetchSimplify, fetchVansh, fetchZshah101];

export async function fetchDataInternships({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const results = await Promise.allSettled(SOURCES.map((fn) => fn()));
  const jobs = results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
  if (jobs.length === 0) {
    const firstError = results.find((r) => r.status === "rejected");
    throw firstError ? firstError.reason : new Error("No listings available");
  }

  // Merge duplicates across sources (same posting mirrored in multiple
  // feeds), keyed by application URL. Sources can disagree on term/degree
  // tags for the same posting, so union those fields rather than picking
  // one source arbitrarily, and treat it active if any copy is active.
  const byUrl = new Map();
  for (const job of jobs) {
    const key = urlDedupeKey(job.url) || job.job_id;
    const existing = byUrl.get(key);
    if (!existing) {
      byUrl.set(key, job);
      continue;
    }
    existing.active = existing.active || job.active;
    existing.terms = [...new Set([...existing.terms, ...job.terms])];
    existing.degrees = [...new Set([...existing.degrees, ...job.degrees])];
    existing.date_posted = [existing.date_posted, job.date_posted]
      .filter(Boolean)
      .sort()[0] || null;
  }

  const filtered = [...byUrl.values()]
    .filter((job) => job.active)
    .filter((job) => isDataRole(job.position))
    .filter((job) => isInternshipTitle(job.position))
    .filter((job) => acceptsBachelors(job.degrees))
    .filter((job) => !isOutOfScope(job.terms))
    .map(({ active, ...job }) => job)
    .sort((a, b) => (b.date_posted || "").localeCompare(a.date_posted || ""));

  cache = { data: filtered, fetchedAt: now };
  return filtered;
}
