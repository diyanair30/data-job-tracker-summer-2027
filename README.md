# Data Internship Tracker

Full-stack tracker for "data"-titled internships (Data Engineer, Data Analyst, Data Scientist,
Data Analytics, etc.).

- **Open Internships** page: live feed of currently active internships requiring a Bachelor's
  degree, pulled from a continuously-updated public listings feed. Check a box to mark one as
  applied — it's added to your tracker automatically.
- **My Applications** page: every internship you've applied to, with Company, Position, Date
  Applied, and Application Link auto-filled, plus editable Status (dropdown), Stage Due Date,
  Contact, Salary Range, Location, and Notes.

## Stack

- `server/`: Express + SQLite (`better-sqlite3`) API
- `client/`: React (Vite) frontend

## Run it

```bash
cd ~/Desktop/job-tracker
npm install --prefix server
npm install --prefix client
npm run dev
```

This starts the API on http://localhost:4000 and the frontend on http://localhost:5173 (Vite
proxies `/api` to the backend).
