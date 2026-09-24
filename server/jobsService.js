const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

let cache = { data: null, fetchedAt: 0 };

// Classifies a listing into the role families this tracker cares about:
// Data (data/analytics/AI/ML), Product (management, plus Program
// Manager/TPM roles which are grouped in with Product), Consulting, and
// Technology (technology/IT roles and early-career programs like sophomore
// internships). Generic software/hardware engineering titles are
// intentionally left out — they'd outnumber everything else combined.
// Simplify tags some listings with a category ("Product", "Product
// Management") that catches roles a title regex alone would miss (e.g.
// "Product Analyst Intern"); other sources don't have that field.
function roleCategory(title, sourceCategory) {
  if (/data/i.test(title)) return "Data";
  if (/consult/i.test(title)) return "Consulting";
  if (
    /(product|program) (manager|management|analyst|operations)/i.test(title) ||
    sourceCategory === "Product" ||
    sourceCategory === "Product Management"
  ) {
    return "Product";
  }
  if (
    /analytic|machine learning|deep learning|artificial intelligence|business intelligence|\b(ai|ml|genai|llm)\b/i.test(title)
  ) {
    return "Data";
  }
  if (
    /technolog|\btech\b|sophomore|freshman|first[- ]year|early (career|insight|talent)/i.test(title) ||
    /\bIT\b/.test(title)
  ) {
    return "Technology";
  }
  return null;
}

// Bay Area + Sacramento-area locations. Sources format locations every which
// way ("SF", "US-California-Palo Alto", "San Jose - California"), and some
// listings are multi-location, so check each segment. Distinctive names match
// on their own; names shared with towns in other states (Dublin, Newark,
// Concord, Richmond...) also need a CA/California marker in the segment.
const NORCAL_DISTINCT =
  /\b((south )?sf|san francisco|bay area|silicon valley|palo alto|menlo park|cupertino|mountain view|foster city|redwood city|sunnyvale|santa clara|milpitas|los gatos|los altos|san mateo|san bruno|south san francisco|emeryville|sacramento|rancho cordova|el dorado hills)\b/i;
const NORCAL_NEEDS_CA =
  /\b(san jose|oakland|berkeley|fremont|hayward|san leandro|union city|newark|pleasanton|dublin|livermore|san ramon|walnut creek|concord|richmond|alameda|burlingame|millbrae|belmont|san carlos|brisbane|campbell|saratoga|half moon bay|novato|san rafael|sausalito|mill valley|petaluma|santa rosa|napa|vallejo|santa cruz|folsom|roseville|rocklin|elk grove|davis|citrus heights|lincoln|woodland(?! hills))\b/i;

function isBayAreaOrSacramento(location) {
  return (location || "")
    .split(/;|•|\/| or /)
    .some(
      (seg) =>
        !/costa rica/i.test(seg) &&
        (NORCAL_DISTINCT.test(seg) ||
          (NORCAL_NEEDS_CA.test(seg) && /\bCA\b|california/i.test(seg)))
    );
}

// Hardware / electrical engineering roles, excluded from the Bay Area &
// Sacramento "any developer role" catch-all. An explicitly software title
// always wins: sources tag e.g. "Embedded Software Engineer Intern" or
// "Software Engineer Intern - Vehicle UI" as Hardware, but they're developer
// roles.
function isHardwareRole(title, sourceCategory) {
  if (/software|developer|\bswe\b|full[- ]?stack|back[- ]?end|front[- ]?end|\bweb\b|programmer/i.test(title)) {
    return false;
  }
  return (
    /hardware/i.test(sourceCategory || "") ||
    /hardware|electrical|\bEE\b|firmware|fpga|asic|silicon|circuit|analog|mixed[- ]signal|\bRF\b|pcb|physical design|layout|design verification|\bdv\b|validation|soc\b|semiconductor|photonic|optical|power electronics|mechanical|manufacturing|process engineer|test engineer|product engineer|packaging|thermal|antenna|signal integrity|dram|nand|memory design|chip|device|sensor|materials|chemical|avionics|rtl|verilog|cpu design|gpu design|lithography|yield/i.test(
      title
    )
  );
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

function mergeInto(existing, job) {
  existing.active = existing.active || job.active;
  existing.terms = [...new Set([...existing.terms, ...job.terms])];
  existing.degrees = [...new Set([...existing.degrees, ...job.degrees])];
  existing.date_posted =
    [existing.date_posted, job.date_posted].filter(Boolean).sort()[0] || null;
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
    source_category: job.category || null,
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
    source_category: null,
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
    source_category: job.category || null,
  }));
}

// NOTE: SimplifyJobs/Summer2027-Internships was evaluated as an additional
// source, but its listings.json is byte-for-byte identical to
// SimplifyJobs/Summer2026-Internships (same IDs, same URLs) — it's a mirror,
// not a distinct dataset, so it isn't included here.
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

  // Pass 1: merge duplicates across sources (same posting mirrored in
  // multiple feeds), keyed by application URL. Sources can disagree on
  // term/degree tags for the same posting, so union those fields rather
  // than picking one source arbitrarily.
  const byUrl = new Map();
  for (const job of jobs) {
    const key = urlDedupeKey(job.url) || job.job_id;
    const existing = byUrl.get(key);
    if (!existing) {
      byUrl.set(key, job);
    } else {
      mergeInto(existing, job);
    }
  }

  // Pass 2: a single source can also list the exact same posting twice
  // under different URLs (e.g. Boeing's same requisition posted via both
  // an "EXTERNAL_CAREERS" and an "INTERN" Workday path). Catch those by
  // company + title + location, which is stable for a genuine duplicate
  // but won't collide across two different postings at different offices.
  const byIdentity = new Map();
  for (const job of byUrl.values()) {
    const key = [job.company, job.position, job.location]
      .map((s) => (s || "").trim().toLowerCase())
      .join("|");
    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, job);
    } else {
      mergeInto(existing, job);
    }
  }

  const filtered = [...byIdentity.values()]
    .filter((job) => job.active)
    .filter((job) => isInternshipTitle(job.position))
    .filter((job) => acceptsBachelors(job.degrees))
    .filter((job) => !isOutOfScope(job.terms))
    .map((job) => {
      const bay_area_sac = isBayAreaOrSacramento(job.location);
      // In the Bay Area & Sacramento, keep any non-hardware role — not just
      // the tracked categories — under a catch-all "Software" category.
      const category =
        roleCategory(job.position, job.source_category) ||
        (bay_area_sac && !isHardwareRole(job.position, job.source_category) ? "Software" : null);
      return { ...job, category, bay_area_sac };
    })
    .filter((job) => job.category !== null)
    .map(({ active, source_category, ...job }) => job)
    .sort((a, b) => (b.date_posted || "").localeCompare(a.date_posted || ""));

  cache = { data: filtered, fetchedAt: now };
  return filtered;
}
