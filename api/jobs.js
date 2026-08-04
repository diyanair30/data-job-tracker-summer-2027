import { fetchDataInternships } from "../server/jobsService.js";

export default async function handler(req, res) {
  try {
    const jobs = await fetchDataInternships({ force: req.query.refresh === "true" });
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=900");
    res.status(200).json(jobs);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
