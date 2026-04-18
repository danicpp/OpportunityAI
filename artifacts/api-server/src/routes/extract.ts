import { Router } from "express";
import { ExtractOpportunitiesBody } from "@workspace/api-zod";
import { extractOpportunityFromEmail } from "../lib/gemini-extract";
import { scoreOpportunity } from "../lib/scoring";
import { getProfile, appendOpportunities } from "../lib/firestore";
import type { StudentProfile } from "../lib/firestore";
import { randomUUID, createHash } from "crypto";

const router = Router();

router.post("/extract", async (req, res) => {
  // ── SSE headers ───────────────────────────────────────────────────────────
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": "*",
  });

  function send(event: string, data: unknown) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    (res as any).flush?.();
  }

  function sendError(msg: string) {
    send("error", { message: msg });
    res.end();
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  const parse = ExtractOpportunitiesBody.safeParse(req.body);
  if (!parse.success) {
    return sendError("Invalid request body");
  }

  const { emails, profileId } = parse.data;
  if (!emails || emails.length === 0) {
    return sendError("No emails provided");
  }

  const emailList = emails.slice(0, 20);

  // ── Load student profile ──────────────────────────────────────────────────
  let profile: StudentProfile | null = null;
  try {
    profile = await getProfile(profileId ?? "default");
  } catch {}

  const API_KEYS = [
    "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",
    "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",
    "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"
  ];

  // ── Begin stream ──────────────────────────────────────────────────────────
  send("start", { total: emailList.length, profileLoaded: !!profile });

  const results: ReturnType<typeof buildOppRecord>[] = [];

  let currentJobIndex = 0;
  const processedHashes = new Set<string>();

  async function worker(workerId: number, apiKey: string) {
    while (true) {
      const i = currentJobIndex++;
      if (i >= emailList.length) break;

      const emailText = emailList[i];
      const preview = emailText.slice(0, 80).replace(/\n/g, " ").trim();
      
      const hash = createHash("sha256").update(emailText).digest("hex");
      if (processedHashes.has(hash)) {
        send("skipped", { index: i + 1, total: emailList.length, preview, reason: "Duplicate email processed previously" });
        continue;
      }
      processedHashes.add(hash);

      send("analyzing", { index: i + 1, total: emailList.length, preview });

      try {
        const extracted = await extractOpportunityFromEmail(emailText.slice(0, 8000), apiKey);

        if (!extracted || !extracted.isOpportunity) {
          const reason = extracted?.rejectionReason || "AI determined this is not an actionable student opportunity.";
          send("skipped", { index: i + 1, total: emailList.length, preview, reason });
          continue;
        }

        const scoring = scoreOpportunity(extracted as any, profile as any);
        const opp = buildOppRecord(extracted, scoring, profile, emailText);
        results.push(opp);

        // Rank everything so far (provisional)
        results.sort((a, b) => b.score - a.score);
        results.forEach((o, idx) => (o.rank = idx + 1));

        send("opportunity", { index: i + 1, opportunity: opp });
      } catch (err) {
        req.log.error({ err }, `Email ${i + 1} failed on worker ${workerId}`);
        send("skipped", { index: i + 1, preview, reason: "Extraction failed" });
      }
    }
  }

  // Launch parallel workers according to available keys
  await Promise.all(API_KEYS.map((key, index) => worker(index, key)));

  // Final re-rank & persist to Firestore
  results.sort((a, b) => b.score - a.score);
  results.forEach((o, idx) => (o.rank = idx + 1));

  try {
    await appendOpportunities(results);
  } catch (err) {
    req.log.error({ err }, "Failed to persist to Firestore");
  }

  send("done", {
    totalProcessed: emailList.length,
    totalOpportunities: results.length,
    processedAt: new Date().toISOString(),
  });

  res.end();
});

function buildOppRecord(
  opp: Awaited<ReturnType<typeof extractOpportunityFromEmail>> & object,
  scoring: ReturnType<typeof scoreOpportunity>,
  profile: StudentProfile | null,
  sourceEmailText: string
) {
  return {
    id: randomUUID(),
    profileId: profile?.id ?? null,
    type: (opp as any).type ?? "other",
    title: (opp as any).title ?? "Unknown",
    organization: (opp as any).organization || null,
    deadline: (opp as any).deadline || null,
    eligibility: (opp as any).eligibility ?? [],
    requirements: (opp as any).requirements ?? [],
    location: (opp as any).location || null,
    link: (opp as any).link || null,
    urgencyHint: (opp as any).urgencyHint || null,
    score: scoring.score,
    rank: 0,
    scoreBreakdown: scoring.scoreBreakdown,
    explanation: scoring.explanation,
    sourceEmailText,
    createdAt: new Date().toISOString(),
  };
}

export default router;
