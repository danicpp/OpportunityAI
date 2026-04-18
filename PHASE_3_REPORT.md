# Phase 3 Report — Scoring Engine

**Status:** Complete  
**Date:** 2026-04-18

---

## Objective
Build a deterministic, explainable scoring engine that ranks opportunities based on student profile fit.

---

## Core Philosophy

> AI understands the data. Your backend makes the decision.

The scoring engine is **100% deterministic** — same input always produces the same output. Every point is traceable. Every ranking can be justified to judges.

---

## Scoring Formula

```
score = type_match (max 30)
      + skill_match (max 25)
      + eligibility_match (max 20)
      + deadline_urgency (max 15)
      + location_match (max 5)
      + completeness (max 5)
      = 100 points total
```

---

## Detailed Scoring Logic

### 1. Type Match (max 30 points)
```
preferred_type match → +30
no preferences set   → +15
not preferred        → +5
```

### 2. Skill Match (max 25 points)
```
Extract technical keywords from requirements[]
Compare against student skills[]
normalize both sides (lowercase, strip symbols)
match_ratio = matched_skills / total_required_skills
score = round(match_ratio * 25)
```

Normalization handles: `Python` == `python`, `ML` ≈ `machine-learning`

### 3. Eligibility Check (max 20 points)
Parsed from the `eligibility[]` array using regex:
```
CGPA regex: /cgpa\s*[>≥>=]\s*(\d+\.?\d*)/i
Semester regex: /semester\s+(\d+)(?:\s*(?:-|to)\s*(\d+))?/i
```

| Condition | Points |
|-----------|--------|
| CGPA req found + user meets it | +10 |
| CGPA req found + user FAILS it | **-30 (big penalty)** |
| No CGPA req | +10 |
| Semester req found + in range | +10 |
| Semester req found + out of range | **-20 (big penalty)** |
| No semester req | +10 |

**Why penalties?** An opportunity you don't qualify for should rank BELOW opportunities you qualify for, even if it's a better match otherwise.

### 4. Deadline Urgency (max 15 points)
```
days_left <= 0  → 0 pts (+ risk alert: expired)
days_left <= 3  → 15 pts (+ urgent next step)
days_left <= 7  → 10 pts
days_left <= 14 → 5 pts
days_left > 14  → 2 pts
```

### 5. Location Match (max 5 points)
```
user = Remote + opp = Remote → +5
user = Both → +5
matched location → +5
mismatch → +1
```

### 6. Completeness (max 5 points)
```
deadline present → +2
link present → +2
requirements listed → +1
```

---

## Explanation Engine

Every scored opportunity generates human-readable explanations:

```json
{
  "reasons": [
    "Matches your preferred type: internship",
    "You have 3/4 required skills (Python, ML, PyTorch)",
    "You meet the CGPA requirement (3.2 ≥ 3.0)",
    "Deadline in 3 days — act immediately"
  ],
  "missing": [
    "Skill gap: TensorFlow"
  ],
  "nextSteps": [
    "Apply TODAY — deadline is extremely close",
    "Prepare: CV, Transcript",
    "Apply via the provided link before the deadline"
  ],
  "riskAlerts": []
}
```

---

## No-Profile Mode

When no student profile exists, the engine gracefully degrades:
- Scores based on deadline urgency and completeness only
- Adds a `missing` note: "Complete your profile for personalized scoring"
- App still shows results and is useful even on first launch

---

## File: `artifacts/api-server/src/lib/scoring.ts`

Pure TypeScript function, no external dependencies:
```typescript
export function scoreOpportunity(
  opp: ExtractedOpp,
  profile: StudentProfileRow | null
): ScoreResult
```

Testable in isolation — the entire scoring logic is a single pure function.

---

## Why This Wins Hackathon Judging

When a judge asks "Why is this ranked #1?" — you can say:

> "It scored 87/100: 30 for matching internship preference, 23 for skill match (Python + AI), 20 for meeting CGPA, 10 for 5-day deadline urgency, and 4 for completeness. The algorithm is deterministic — run it again and you get the same result."

That's an answer that earns respect.
