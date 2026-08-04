# Data Internship Tracker

A full-stack tracker for internships in Data, Product, and Consulting roles. It pulls live
listings from public internship-tracking feeds, filters them down to roles that actually match
what you're looking for, and lets you check off the ones you've applied to — auto-filling most of
the application record for you.

## Screenshots

**Open Internships** — the live, filterable feed:

![Open Internships](docs/screenshot-jobboard.png)

**My Applications** — your tracked applications, with an editable status dropdown:

![My Applications](docs/screenshot-applications.png)

## Features

### Open Internships (`/`)

- Live feed aggregated from three continuously-updated public internship trackers:
  [SimplifyJobs/Summer2026-Internships](https://github.com/SimplifyJobs/Summer2026-Internships),
  [vanshb03/Summer2027-Internships](https://github.com/vanshb03/Summer2027-Internships), and
  [zshah101's tech internship list](https://github.com/zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships).
- Filtered to **Data** (Engineer/Analyst/Scientist/Analytics), **Product**, and **Consulting**
  roles — matched by title, not just source tags, so roles like "Product Analyst Intern" are
  caught even when a source doesn't label them.
- Only shows postings that:
  - are currently **active**
  - have **"Intern"** in the title (filters out full-time/grad-assistant roles some sources mix in)
  - **accept a Bachelor's degree** (excludes listings explicitly requiring an advanced degree only)
  - aren't **Fall/Co-op only** terms
- Deduplicates the same posting when it appears across multiple sources (matched by normalized
  application URL) or twice within one source (matched by company + title + location), merging
  their term/degree tags rather than picking one arbitrarily.
- Server-side cache (15 min) to avoid hammering the upstream feeds; a "Refresh Listings" button
  forces a re-fetch.
- Filter by category, or search by title/company/location.
- Check the box next to a listing to mark it applied — this creates a matching row on the
  Applications page automatically (company, position, date applied, and link pre-filled).

### My Applications (`/applications`)

- Every internship you've applied to, one row per application.
- **Auto-filled** when added from the Open Internships page: Company, Position, Date Applied,
  Application Link.
- **Editable** on every row:
  - **Status** — dropdown: Applied, OA, Phone Screen, First Round Interview, Second Round
    Interview, Final Round Interview, Offer, Rejected, Withdrawn
  - Stage Due Date, Contact, Application Link, Salary Range, Location, Notes
- "+ Add Application" to manually track one that isn't in the Open Internships feed.
- Remove a row to un-track an application.

## Stack

- `server/`: Node.js + Express API, [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)
  for local persistent storage (WAL mode)
- `client/`: React + Vite frontend

```
job-tracker/
├── server/
│   ├── index.js         # Express routes (jobs, applications CRUD)
│   ├── jobsService.js    # Fetches, merges, dedupes, and filters listings from all sources
│   ├── db.js              # SQLite connection + schema
│   └── data/              # SQLite database file (gitignored)
└── client/
    └── src/
        ├── pages/JobBoard.jsx      # Open Internships page
        ├── pages/Applications.jsx  # My Applications page
        └── api.js                 # Fetch wrappers for the API
```

## Run it

```bash
npm install --prefix server
npm install --prefix client
npm run dev
```

This starts the API on http://localhost:4000 and the frontend on http://localhost:5173 (Vite
proxies `/api` to the backend). Data is stored locally in `server/data/jobtracker.db` — nothing
leaves your machine except the outbound fetches to the public listings feeds above.

**Note:** the dev server watches for file changes and auto-restarts (`node --watch index.js`). If
you ever need to inspect or edit the database directly, stop the server first, or go through the
API (`curl http://localhost:4000/api/applications`) — editing the SQLite file directly while the
server is running can leave the on-disk file and the live connection out of sync.

## API

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/jobs` | Current filtered/deduped internship listings. `?refresh=true` bypasses the cache. |
| GET | `/api/applications` | All tracked applications. |
| POST | `/api/applications` | Create an application (from the job board checkbox, or manually). |
| PATCH | `/api/applications/:id` | Update editable fields (status, dates, contact, notes, etc.). |
| DELETE | `/api/applications/:id` | Remove an application. |
| GET | `/api/status-options` | The list of valid status dropdown values. |
