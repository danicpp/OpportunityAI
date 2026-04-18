# Phase 2 Report — AI Extraction Layer

**Status:** Complete  
**Date:** 2026-04-18

---

## Objective
Build the AI extraction layer that reads raw email text and outputs structured opportunity data.

---

## Architecture Decision: Hybrid Approach

The extraction layer uses a **hybrid system**:

1. **Keyword Pre-filter** (fast, no API cost): Skip emails that clearly aren't opportunities  
2. **Gemini 2.5 Flash** (AI): Extract structured JSON from emails that pass the filter  
3. **Deterministic Scorer** (your logic): Score and rank — AI does NOT decide priority

```
Email Text
    ↓
Keyword Pre-filter (free)
    ↓ (if opportunity keywords found)
Gemini 2.5 Flash (AI extraction)
    ↓
Structured JSON
    ↓
Scoring Engine (deterministic)
    ↓
Ranked + Explained Results
```

---

## AI Extraction Prompt Design

The extraction prompt asks Gemini to return a strict JSON schema:

```json
{
  "isOpportunity": true,
  "type": "internship | hackathon | scholarship | competition | job | fellowship | other",
  "title": "string",
  "organization": "string",
  "deadline": "YYYY-MM-DD | null",
  "eligibility": ["CGPA requirements", "semester constraints", "degree requirements"],
  "requirements": ["CV", "transcript", "Python", "etc."],
  "location": "Remote | Onsite | city",
  "link": "application URL",
  "urgencyHint": "high | medium | low"
}
```

Key design choices:
- `responseMimeType: "application/json"` → forces valid JSON output
- `maxOutputTokens: 8192` → sufficient headroom
- Eligibility as array → enables CGPA/semester extraction for scoring
- Requirements separate from eligibility → allows skill matching

---

## Keyword Pre-filter

Before calling Gemini, a fast keyword check determines if the email is even worth extracting:

```typescript
const positiveKeywords = [
  "internship", "hackathon", "scholarship", "fellowship", "competition",
  "apply", "application", "deadline", "stipend", "prize", "award",
  "hiring", "opportunity", "register", "program", "join us",
  "we are looking", "position", "opening"
];
```

**Why this matters**: Skips API calls for newsletters, spam, promotional emails. Typical inbox has 70-80% non-opportunity emails — this saves significant cost and time.

---

## Batch Processing

Multiple emails are processed using `batchProcess` utility:
- Concurrency: 3 (3 emails processed simultaneously)
- Retries: 3 (handles rate limiting gracefully)
- Safety cap: 20 emails max per request

```typescript
const extracted = await batchProcess(
  emails.slice(0, 20),
  async (emailText) => extractOpportunityFromEmail(emailText.slice(0, 8000)),
  { concurrency: 3, retries: 3 }
);
```

---

## File: `artifacts/api-server/src/lib/gemini-extract.ts`

Key responsibilities:
- Pre-filter emails by keywords
- Call Gemini with structured prompt
- Parse and validate JSON response
- Normalize missing fields with safe defaults

---

## Performance Characteristics

| Emails | Approx Time |
|--------|-------------|
| 1-3    | 3-5 seconds |
| 5-10   | 8-15 seconds |
| 15-20  | 20-35 seconds |

All processing happens concurrently (3 at a time), not sequentially.
