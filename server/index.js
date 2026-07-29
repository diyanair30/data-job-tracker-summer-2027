import express from "express";
import cors from "cors";
import db from "./db.js";
import { fetchDataInternships } from "./jobsService.js";

const app = express();
app.use(cors());
app.use(express.json());

export const STATUS_OPTIONS = [
  "Applied",
  "OA",
  "Phone Screen",
  "First Round Interview",
  "Second Round Interview",
  "Final Round Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
];

// ---- Jobs (live listings) ----

app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await fetchDataInternships({ force: req.query.refresh === "true" });
    const appliedRows = db.prepare("SELECT id, job_id FROM applications").all();
    const applicationIdByJobId = new Map(appliedRows.map((r) => [r.job_id, r.id]));
    const withStatus = jobs.map((j) => ({
      ...j,
      applied: applicationIdByJobId.has(j.job_id),
      application_id: applicationIdByJobId.get(j.job_id) || null,
    }));
    res.json(withStatus);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch live job listings", detail: err.message });
  }
});

// ---- Applications ----

app.get("/api/applications", (req, res) => {
  const rows = db.prepare("SELECT * FROM applications ORDER BY date_applied DESC, id DESC").all();
  res.json(rows);
});

app.get("/api/status-options", (req, res) => {
  res.json(STATUS_OPTIONS);
});

// Create an application record — either from checking off a listed job
// (job_id set, most fields autofilled) or a fully manual entry the user
// types in themselves (no job_id, any field can be supplied up front).
app.post("/api/applications", (req, res) => {
  const {
    job_id,
    company,
    position,
    application_link,
    location,
    date_posted,
    date_applied,
    status,
    stage_due_date,
    contact,
    salary_range,
    notes,
  } = req.body;

  if (!company || !position) {
    return res.status(400).json({ error: "company and position are required" });
  }

  const existing = job_id
    ? db.prepare("SELECT * FROM applications WHERE job_id = ?").get(job_id)
    : null;
  if (existing) {
    return res.status(200).json(existing);
  }

  const stmt = db.prepare(`
    INSERT INTO applications
      (job_id, company, position, date_applied, status, application_link, location, date_posted,
       stage_due_date, contact, salary_range, notes)
    VALUES (@job_id, @company, @position, @date_applied, @status, @application_link, @location, @date_posted,
       @stage_due_date, @contact, @salary_range, @notes)
  `);
  const info = stmt.run({
    job_id: job_id || null,
    company,
    position,
    date_applied: date_applied || new Date().toISOString().slice(0, 10),
    status: status || "Applied",
    application_link: application_link || null,
    location: location || null,
    date_posted: date_posted || null,
    stage_due_date: stage_due_date || null,
    contact: contact || null,
    salary_range: salary_range || null,
    notes: notes || null,
  });

  const created = db.prepare("SELECT * FROM applications WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(created);
});

// Update editable fields on an application
const EDITABLE_FIELDS = [
  "status",
  "stage_due_date",
  "contact",
  "application_link",
  "salary_range",
  "location",
  "notes",
  "date_applied",
  "company",
  "position",
];

app.patch("/api/applications/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM applications WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in req.body) updates[field] = req.body[field];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No editable fields provided" });
  }

  const setClause = Object.keys(updates)
    .map((f) => `${f} = @${f}`)
    .join(", ");
  db.prepare(`UPDATE applications SET ${setClause} WHERE id = @id`).run({ ...updates, id });

  const updated = db.prepare("SELECT * FROM applications WHERE id = ?").get(id);
  res.json(updated);
});

// Remove an application (unchecking a job / deleting a manual entry)
app.delete("/api/applications/:id", (req, res) => {
  db.prepare("DELETE FROM applications WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Job tracker API listening on http://localhost:${PORT}`);
});
