import { Router } from "express";
import { getOpportunities, clearOpportunities, getProfile } from "../lib/firestore";

const router = Router();

router.get("/opportunities", async (req, res) => {
  try {
    const profileId = req.query.profileId as string | undefined;
    const opportunities = await getOpportunities(profileId);
    let profile = null;
    try {
      if (profileId) profile = await getProfile(profileId);
    } catch {}
    return res.json({ opportunities, profile });
  } catch (err) {
    req.log.error({ err }, "GET /opportunities failed");
    return res.status(500).json({ error: "Failed to fetch opportunities" });
  }
});

router.delete("/opportunities", async (req, res) => {
  try {
    const profileId = req.query.profileId as string | undefined;
    await clearOpportunities(profileId);
    return res.status(200).json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "DELETE /opportunities failed");
    return res.status(500).json({ error: "Failed to clear opportunities" });
  }
});

export default router;
