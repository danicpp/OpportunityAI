import { logger } from "./logger";

const OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ExtractedOpp {
  isOpportunity: boolean;
  rejectionReason?: string;
  type: string;
  title: string;
  organization: string;
  deadline: string | null;
  eligibility: string[];
  requirements: string[];
  location: string;
  link: string;
  urgencyHint: "high" | "medium" | "low";
}

const SYSTEM_PROMPT = `You are an expert opportunity extraction system. Your only job is to analyze email text and return a strict JSON object. Never explain or add commentary — output raw JSON only.`;

const userPrompt = (emailText: string) => `Analyze this email and extract structured data.

EMAIL:
"""
${emailText}
"""

Return ONLY a valid JSON object with this exact structure — no markdown, no code fences, no explanation:

{
  "isOpportunity": boolean,
  "rejectionReason": string,
  "type": "internship" | "hackathon" | "scholarship" | "competition" | "job" | "fellowship" | "other",
  "title": string,
  "organization": string,
  "deadline": "YYYY-MM-DD" | null,
  "eligibility": string[],
  "requirements": string[],
  "location": string,
  "link": string,
  "urgencyHint": "high" | "medium" | "low"
}

Rules:
- isOpportunity: true only if email describes an opportunity students can apply to
- rejectionReason: if isOpportunity is false, a concise one-sentence reason (e.g. "Blog post / informational content, not an application opportunity" or "Rejection notice — no action for the student"); empty string if isOpportunity is true
- type: best match from the enum
- title: concise name of the opportunity
- organization: company/institution offering it
- deadline: extract from email text, format as YYYY-MM-DD, null if not found
- eligibility: CGPA requirements, semester/year constraints, degree requirements — each as a separate string
- requirements: documents needed (CV, transcript, etc.) and technical skills required
- location: "Remote", "Onsite", city name, or empty string
- link: application URL if present, otherwise empty string
- urgencyHint: "high" if deadline ≤7 days or heavily emphasized, "medium" if 8-14 days, "low" otherwise`;

// Fast keyword pre-filter — skip emails that are clearly not opportunities
function mightBeOpportunity(text: string): boolean {
  const lower = text.toLowerCase();
  const keywords = [
    "internship", "hackathon", "scholarship", "fellowship", "competition",
    "apply", "application", "deadline", "stipend", "prize", "award",
    "hiring", "opportunity", "register", "program", "join us",
    "we are looking", "we're looking", "position", "opening",
  ];
  return keywords.some((kw) => lower.includes(kw));
}

async function callOpenRouter(prompt: string, overrideApiKey?: string): Promise<string> {
  const apiKey = overrideApiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://opportunityai.repl.co",
      "X-Title": "OpportunityAI",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices?.[0]?.message?.content ?? "";
}

export async function extractOpportunityFromEmail(
  emailText: string,
  apiKey?: string
): Promise<ExtractedOpp | null> {
  // Skip obviously non-opportunity emails before calling AI
  if (!mightBeOpportunity(emailText)) {
    return {
      isOpportunity: false,
      rejectionReason: "No opportunity keywords detected — likely informational, marketing, or notification email.",
      type: "other",
      title: "Non-opportunity email",
      organization: "",
      deadline: null,
      eligibility: [],
      requirements: [],
      location: "",
      link: "",
      urgencyHint: "low",
    };
  }

  try {
    const raw = await callOpenRouter(userPrompt(emailText), apiKey);

    // Strip any accidental markdown fences the model might add
    const clean = raw
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    const parsed = JSON.parse(clean) as ExtractedOpp;

    // Defensive normalization
    if (typeof parsed.isOpportunity !== "boolean") parsed.isOpportunity = true;
    parsed.eligibility = Array.isArray(parsed.eligibility) ? parsed.eligibility : [];
    parsed.requirements = Array.isArray(parsed.requirements) ? parsed.requirements : [];
    parsed.title = parsed.title || "Unknown Opportunity";
    parsed.type = parsed.type || "other";
    parsed.urgencyHint = (["high", "medium", "low"] as const).includes(
      parsed.urgencyHint as any
    )
      ? parsed.urgencyHint
      : "low";

    return parsed;
  } catch (err) {
    logger.error({ err }, "OpenRouter extraction failed");
    return null;
  }
}
