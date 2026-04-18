import { Router } from "express";
import { SaveProfileBody } from "@workspace/api-zod";
import { getProfile, saveProfile } from "../lib/firestore";

const router = Router();

router.get("/profile", async (req, res) => {
  try {
    const profileId = (req.query.profileId as string) || "default";
    const profile = await getProfile(profileId);
    if (!profile) {
      return res.status(404).json({ error: "No profile found" });
    }
    return res.json(profile);
  } catch (err) {
    req.log.error({ err }, "GET /profile failed");
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.put("/profile", async (req, res) => {
  const parse = SaveProfileBody.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid profile data", details: parse.error.issues });
  }

  const data = parse.data;
  const profileId = (req.query.profileId as string) || "default";

  try {
    const saved = await saveProfile({
      id: profileId,
      degree: data.degree ?? null,
      semester: data.semester ?? null,
      cgpa: data.cgpa ?? null,
      skills: data.skills ?? [],
      interests: data.interests ?? [],
      preferredTypes: data.preferredTypes ?? [],
      locationPreference: data.locationPreference ?? null,
      financialNeed: data.financialNeed ?? null,
    });
    return res.json(saved);
  } catch (err) {
    req.log.error({ err }, "PUT /profile failed");
    return res.status(500).json({ error: "Failed to save profile" });
  }
});

export default router;

