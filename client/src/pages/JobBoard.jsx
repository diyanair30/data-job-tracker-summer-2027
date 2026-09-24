import { useEffect, useMemo, useState } from "react";
import { getJobs, createApplication, deleteApplication } from "../api.js";

export default function JobBoard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [pending, setPending] = useState(() => new Set());

  async function load(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const data = await getJobs(refresh);
      setJobs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs
      .filter((j) => categoryFilter === "All" || j.category === categoryFilter)
      .filter((j) => locationFilter === "All" || j.bay_area_sac)
      // "Software" is a Bay Area & Sacramento-only catch-all; keep it out of
      // the default view unless that location (or Software itself) is chosen.
      .filter(
        (j) => j.category !== "Software" || locationFilter !== "All" || categoryFilter === "Software"
      )
      .filter(
        (j) =>
          !q ||
          j.position.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
  }, [jobs, search, categoryFilter, locationFilter]);

  async function markApplied(job) {
    setPending((prev) => new Set(prev).add(job.job_id));
    try {
      await createApplication({
        job_id: job.job_id,
        company: job.company,
        position: job.position,
        application_link: job.url,
        location: job.location,
        date_posted: job.date_posted,
      });
      setJobs((prev) =>
        prev.map((j) => (j.job_id === job.job_id ? { ...j, applied: true } : j))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(job.job_id);
        return next;
      });
    }
  }

  async function unmarkApplied(job) {
    setPending((prev) => new Set(prev).add(job.job_id));
    try {
      await deleteApplication(job.application_id);
      setJobs((prev) =>
        prev.map((j) =>
          j.job_id === job.job_id ? { ...j, applied: false, application_id: null } : j
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(job.job_id);
        return next;
      });
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Open Internships</h2>
          <p className="subtle">
            Live feed from three continuously-updated internship trackers, filtered to active
            Data & AI, Product Management, Consulting, and Technology roles that accept a Bachelor's degree,
            excluding Fall and co-op postings — plus any non-hardware role in the Bay Area &
            Sacramento. {filtered.length} shown.
          </p>
        </div>
        <div className="actions">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">All categories</option>
            <option value="Data">Data &amp; AI</option>
            <option value="Product">Product</option>
            <option value="Consulting">Consulting</option>
            <option value="Technology">Technology</option>
            <option value="Software">Software (Bay Area &amp; Sac)</option>
          </select>
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="All">All locations</option>
            <option value="BayAreaSac">Bay Area &amp; Sacramento</option>
          </select>
          <input
            className="search"
            placeholder="Filter by title, company, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => load(true)} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Listings"}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="col-check">Applied</th>
              <th>Category</th>
              <th>Position</th>
              <th>Company</th>
              <th>Location</th>
              <th>Term</th>
              <th>Date Posted</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={job.job_id} className={job.applied ? "row-applied" : ""}>
                <td className="col-check">
                  <input
                    type="checkbox"
                    checked={job.applied}
                    disabled={pending.has(job.job_id)}
                    onChange={() => (job.applied ? unmarkApplied(job) : markApplied(job))}
                    title={job.applied ? "Uncheck to remove from My Applications" : "Mark as applied"}
                  />
                </td>
                <td>
                  <span className={`badge badge-${job.category.toLowerCase()}`}>
                    {job.category}
                  </span>
                </td>
                <td>{job.position}</td>
                <td>{job.company}</td>
                <td>{job.location || "—"}</td>
                <td>{job.terms.length ? job.terms.join(", ") : "—"}</td>
                <td>{job.date_posted || "—"}</td>
                <td>
                  <a href={job.url} target="_blank" rel="noreferrer">
                    Apply →
                  </a>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  No matching internships found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
