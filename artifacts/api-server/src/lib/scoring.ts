import type { StudentProfileRow } from "@workspace/db";

interface ExtractedOpp {
  type: string;
  title: string;
  organization?: string;
  deadline?: string;
  eligibility: string[];
  requirements: string[];
  location?: string;
  link?: string;
  urgencyHint?: string;
}

export interface ScoreResult {
  score: number;
  scoreBreakdown: {
    typeMatch: number;
    skillMatch: number;
    eligibilityMatch: number;
    deadlineUrgency: number;
    locationMatch: number;
    completeness: number;
  };
  explanation: {
    reasons: string[];
    missing: string[];
    nextSteps: string[];
    riskAlerts: string[];
  };
}

function getDaysLeft(deadline?: string): number | null {
  if (!deadline) return null;
  try {
    const d = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  } catch {
    return null;
  }
}

function extractCgpaRequirement(eligibility: string[]): number | null {
  for (const e of eligibility) {
    const match = e.match(/cgpa\s*[>≥>=]\s*(\d+\.?\d*)/i) ||
                  e.match(/gpa\s*[>≥>=]\s*(\d+\.?\d*)/i) ||
                  e.match(/minimum\s+(?:cgpa|gpa)\s*(?:of\s*)?(\d+\.?\d*)/i);
    if (match) return parseFloat(match[1]);
  }
  return null;
}

function extractSemesterRequirement(eligibility: string[]): { min?: number; max?: number } | null {
  for (const e of eligibility) {
    const match = e.match(/semester\s+(\d+)(?:\s*(?:-|to)\s*(\d+))?/i);
    if (match) {
      return { min: parseInt(match[1]), max: match[2] ? parseInt(match[2]) : undefined };
    }
  }
  return null;
}

function normalizeSkill(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function skillsMatch(oppSkills: string[], userSkills: string[]): { matched: string[]; missing: string[] } {
  const userNorm = userSkills.map(normalizeSkill);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of oppSkills) {
    const norm = normalizeSkill(skill);
    if (userNorm.some(u => u.includes(norm) || norm.includes(u))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }
  return { matched, missing };
}

export function scoreOpportunity(
  opp: ExtractedOpp,
  profile: StudentProfileRow | null
): ScoreResult {
  const reasons: string[] = [];
  const missing: string[] = [];
  const nextSteps: string[] = [];
  const riskAlerts: string[] = [];

  let typeMatch = 0;
  let skillMatch = 0;
  let eligibilityMatch = 0;
  let deadlineUrgency = 0;
  let locationMatch = 0;
  let completeness = 0;

  if (!profile) {
    // No profile: score by completeness and urgency only
    const daysLeft = getDaysLeft(opp.deadline);
    if (daysLeft !== null) {
      if (daysLeft <= 0) { deadlineUrgency = 0; }
      else if (daysLeft <= 3) { deadlineUrgency = 15; reasons.push(`Deadline in ${daysLeft} day(s) — extremely urgent`); }
      else if (daysLeft <= 7) { deadlineUrgency = 10; reasons.push(`Deadline in ${daysLeft} days`); }
      else if (daysLeft <= 14) { deadlineUrgency = 5; }
      else { deadlineUrgency = 2; }
    }
    if (opp.deadline) completeness += 2;
    if (opp.link) { completeness += 2; nextSteps.push("Apply via the provided link"); }
    if (opp.requirements.length > 0) completeness += 1;

    missing.push("Complete your profile for personalized scoring");
    nextSteps.push("Fill in your student profile to get personalized recommendations");

    const score = typeMatch + skillMatch + eligibilityMatch + deadlineUrgency + locationMatch + completeness;
    return {
      score: Math.min(100, score),
      scoreBreakdown: { typeMatch, skillMatch, eligibilityMatch, deadlineUrgency, locationMatch, completeness },
      explanation: { reasons, missing, nextSteps, riskAlerts },
    };
  }

  // TYPE MATCH (max 30)
  const preferredTypes = (profile.preferredTypes as string[]) || [];
  const oppType = opp.type.toLowerCase();
  if (preferredTypes.includes(oppType)) {
    typeMatch = 30;
    reasons.push(`Matches your preferred type: ${opp.type}`);
  } else if (preferredTypes.length === 0) {
    typeMatch = 15;
  } else {
    typeMatch = 5;
  }

  // SKILL MATCH (max 25)
  const userSkills = (profile.skills as string[]) || [];
  const oppRequirements = opp.requirements || [];
  const skillKeywords = oppRequirements.flatMap(r => r.split(/[,\/;]/)).map(s => s.trim()).filter(Boolean);

  if (skillKeywords.length > 0) {
    const { matched, missing: missingSkills } = skillsMatch(skillKeywords, userSkills);
    const matchRatio = matched.length / skillKeywords.length;
    skillMatch = Math.round(matchRatio * 25);
    if (matched.length > 0) {
      reasons.push(`You have ${matched.length}/${skillKeywords.length} required skills (${matched.slice(0, 3).join(", ")})`);
    }
    if (missingSkills.length > 0) {
      missing.push(...missingSkills.slice(0, 3).map(s => `Skill gap: ${s}`));
    }
  } else {
    skillMatch = 10; // No requirements listed = neutral
    reasons.push("No specific skills required");
  }

  // ELIGIBILITY CHECK (max 20)
  const eligibility = opp.eligibility || [];
  const requiredCgpa = extractCgpaRequirement(eligibility);
  const semesterReq = extractSemesterRequirement(eligibility);

  let eligibilityPassed = true;

  if (requiredCgpa !== null) {
    if (profile.cgpa >= requiredCgpa) {
      eligibilityMatch += 10;
      reasons.push(`You meet the CGPA requirement (${profile.cgpa} ≥ ${requiredCgpa})`);
    } else {
      eligibilityPassed = false;
      eligibilityMatch -= 30; // BIG penalty
      riskAlerts.push(`CGPA requirement not met: need ${requiredCgpa}, you have ${profile.cgpa}`);
    }
  } else {
    eligibilityMatch += 10;
  }

  if (semesterReq) {
    const sem = profile.semester;
    const inRange = (!semesterReq.min || sem >= semesterReq.min) &&
                    (!semesterReq.max || sem <= semesterReq.max);
    if (inRange) {
      eligibilityMatch += 10;
      reasons.push("You're in the eligible semester range");
    } else {
      eligibilityPassed = false;
      eligibilityMatch -= 20;
      riskAlerts.push(`Semester requirement not met: need ${semesterReq.min}-${semesterReq.max || "+"}, you're in semester ${sem}`);
    }
  } else {
    eligibilityMatch += 10;
  }

  if (eligibilityPassed && eligibility.length > 0) {
    reasons.push("You meet the eligibility criteria");
  }

  // DEADLINE URGENCY (max 15)
  const daysLeft = getDaysLeft(opp.deadline);
  if (daysLeft !== null) {
    if (daysLeft <= 0) {
      deadlineUrgency = 0;
      riskAlerts.push("Deadline has passed — this opportunity may be closed");
    } else if (daysLeft <= 3) {
      deadlineUrgency = 15;
      reasons.push(`Deadline in ${daysLeft} day(s) — act immediately`);
      nextSteps.unshift("Apply TODAY — deadline is extremely close");
    } else if (daysLeft <= 7) {
      deadlineUrgency = 10;
      reasons.push(`Deadline in ${daysLeft} days — urgent`);
    } else if (daysLeft <= 14) {
      deadlineUrgency = 5;
    } else {
      deadlineUrgency = 2;
    }
  }

  // LOCATION MATCH (max 5)
  const userLoc = (profile.locationPreference as string || "Remote").toLowerCase();
  const oppLoc = (opp.location || "").toLowerCase();
  if (!oppLoc || oppLoc.includes("remote") && userLoc.includes("remote")) {
    locationMatch = 5;
    reasons.push("Location preference matches (Remote)");
  } else if (userLoc === "both") {
    locationMatch = 5;
  } else if (oppLoc.includes(userLoc) || userLoc.includes(oppLoc)) {
    locationMatch = 5;
  } else {
    locationMatch = 1;
  }

  // COMPLETENESS (max 5)
  if (opp.deadline) completeness += 2;
  if (opp.link) { completeness += 2; nextSteps.push("Apply via the provided link before the deadline"); }
  if (opp.requirements.length > 0) completeness += 1;

  // NEXT STEPS
  if (opp.requirements.length > 0) {
    const docs = opp.requirements.filter(r =>
      /cv|resume|transcript|letter|certificate|portfolio|essay/i.test(r)
    );
    if (docs.length > 0) {
      nextSteps.push(`Prepare: ${docs.slice(0, 3).join(", ")}`);
    }
  }
  if (nextSteps.length === 0) {
    nextSteps.push("Review opportunity details and apply if eligible");
  }

  // INTERESTS bonus
  const interests = (profile.interests as string[]) || [];
  const titleLower = opp.title.toLowerCase();
  const orgLower = (opp.organization || "").toLowerCase();
  const matchedInterests = interests.filter(i =>
    titleLower.includes(i.toLowerCase()) || orgLower.includes(i.toLowerCase())
  );
  if (matchedInterests.length > 0) {
    reasons.push(`Matches your interest in ${matchedInterests[0]}`);
  }

  // FINANCIAL NEED bonus for scholarships
  if (profile.financialNeed && oppType === "scholarship") {
    const bonus = 5;
    eligibilityMatch = Math.min(20, eligibilityMatch + bonus);
    reasons.push("Scholarship matches your financial need flag");
  }

  const rawScore = typeMatch + skillMatch + eligibilityMatch + deadlineUrgency + locationMatch + completeness;
  const score = Math.max(0, Math.min(100, rawScore));

  return {
    score,
    scoreBreakdown: {
      typeMatch: Math.max(0, typeMatch),
      skillMatch: Math.max(0, skillMatch),
      eligibilityMatch: Math.max(0, eligibilityMatch),
      deadlineUrgency: Math.max(0, deadlineUrgency),
      locationMatch: Math.max(0, locationMatch),
      completeness: Math.max(0, completeness),
    },
    explanation: { reasons, missing, nextSteps, riskAlerts },
  };
}
