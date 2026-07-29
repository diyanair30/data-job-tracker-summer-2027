import { useEffect, useState } from "react";
import {
  getApplications,
  getStatusOptions,
  createApplication,
  updateApplication,
  deleteApplication,
} from "../api.js";

const EMPTY_FORM = {
  company: "",
  position: "",
  date_applied: new Date().toISOString().slice(0, 10),
  status: "Applied",
  stage_due_date: "",
  contact: "",
  application_link: "",
  salary_range: "",
  location: "",
  notes: "",
};

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getApplications(), getStatusOptions()])
      .then(([apps, statuses]) => {
        setApps(apps);
        setStatusOptions(statuses);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleFieldChange(id, field, value) {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
    try {
      await updateApplication(id, { [field]: value });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this application from your tracker?")) return;
    try {
      await deleteApplication(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    if (!form.company.trim() || !form.position.trim()) {
      setError("Company and Position are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createApplication(form);
      setApps((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>My Applications</h2>
          <p className="subtle">
            Company, position, date applied, and link are filled in automatically when you check
            off an internship. Everything else you can edit here, or add an application yourself
            if it isn't in the open internships list.
          </p>
        </div>
        <div className="actions">
          <button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Add Application"}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <form className="add-form" onSubmit={handleAddSubmit}>
          <div className="add-form-grid">
            <label>
              Company*
              <input
                type="text"
                value={form.company}
                onChange={(e) => updateForm("company", e.target.value)}
                required
              />
            </label>
            <label>
              Position*
              <input
                type="text"
                value={form.position}
                onChange={(e) => updateForm("position", e.target.value)}
                required
              />
            </label>
            <label>
              Date Applied
              <input
                type="date"
                value={form.date_applied}
                onChange={(e) => updateForm("date_applied", e.target.value)}
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => updateForm("status", e.target.value)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Stage Due Date
              <input
                type="date"
                value={form.stage_due_date}
                onChange={(e) => updateForm("stage_due_date", e.target.value)}
              />
            </label>
            <label>
              Contact
              <input
                type="text"
                value={form.contact}
                onChange={(e) => updateForm("contact", e.target.value)}
              />
            </label>
            <label>
              Application Link
              <input
                type="text"
                placeholder="https://..."
                value={form.application_link}
                onChange={(e) => updateForm("application_link", e.target.value)}
              />
            </label>
            <label>
              Salary Range
              <input
                type="text"
                placeholder="e.g. $25-30/hr"
                value={form.salary_range}
                onChange={(e) => updateForm("salary_range", e.target.value)}
              />
            </label>
            <label>
              Location
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateForm("location", e.target.value)}
              />
            </label>
            <label className="add-form-notes">
              Notes
              <input
                type="text"
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
              />
            </label>
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add Application"}
          </button>
        </form>
      )}

      <div className="table-wrap">
        <table className="applications-table">
          <colgroup>
            <col className="col-company" />
            <col className="col-position" />
            <col className="col-date-applied" />
            <col className="col-status" />
            <col className="col-stage-due" />
            <col className="col-contact" />
            <col className="col-link" />
            <col className="col-salary" />
            <col className="col-location" />
            <col className="col-notes" />
            <col className="col-remove" />
          </colgroup>
          <thead>
            <tr>
              <th>Company</th>
              <th>Position</th>
              <th>Date Applied</th>
              <th>Status</th>
              <th>Stage Due Date</th>
              <th>Contact</th>
              <th>Application Link</th>
              <th>Salary Range</th>
              <th>Location</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr key={app.id}>
                <td>{app.company}</td>
                <td>{app.position}</td>
                <td>{app.date_applied}</td>
                <td>
                  <select
                    value={app.status}
                    onChange={(e) => handleFieldChange(app.id, "status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="date"
                    value={app.stage_due_date || ""}
                    onChange={(e) => handleFieldChange(app.id, "stage_due_date", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={app.contact || ""}
                    onChange={(e) => handleFieldChange(app.id, "contact", e.target.value)}
                  />
                </td>
                <td>
                  <div className="link-cell">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={app.application_link || ""}
                      onChange={(e) =>
                        handleFieldChange(app.id, "application_link", e.target.value)
                      }
                    />
                    {app.application_link && (
                      <a href={app.application_link} target="_blank" rel="noreferrer">
                        →
                      </a>
                    )}
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="e.g. $25-30/hr"
                    value={app.salary_range || ""}
                    onChange={(e) => handleFieldChange(app.id, "salary_range", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={app.location || ""}
                    onChange={(e) => handleFieldChange(app.id, "location", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Notes..."
                    value={app.notes || ""}
                    onChange={(e) => handleFieldChange(app.id, "notes", e.target.value)}
                  />
                </td>
                <td>
                  <button className="icon-btn" onClick={() => handleDelete(app.id)} title="Remove">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {!loading && apps.length === 0 && (
              <tr>
                <td colSpan={11} className="empty">
                  No applications yet. Check off an internship from the Open Internships page, or
                  add one yourself above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
