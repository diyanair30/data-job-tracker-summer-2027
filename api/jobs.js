import { fetchDataInternships } from "../server/jobsService.js";

export default async function handler(req, res) {
  try {
    // The demo has no location filter, so leave out the Bay Area & Sacramento
    // catch-all "Software" listings that only the local app's filter shows.
    const jobs = (await fetchDataInternships({ force: req.query.refresh === "true" })).filter(
      (j) => j.category !== "Software"
    );
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=900");
    res.status(200).json(jobs);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
