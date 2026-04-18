export interface StudentProfile {
  id: string;
  degree: string;
  semester: number;
  cgpa: number;
  skills: string[];
  interests: string[];
  preferredTypes: string[];
  locationPreference: string;
  financialNeed: boolean;
  updatedAt: string;
}

export interface StudentProfileInput {
  degree: string;
  semester: number;
  cgpa: number;
  skills: string[];
  interests: string[];
  preferredTypes: string[];
  locationPreference: string;
  financialNeed: boolean;
}

export interface ScoreBreakdown {
  typeMatch: number;
  skillMatch: number;
  eligibilityMatch: number;
  deadlineUrgency: number;
  locationMatch: number;
  completeness: number;
}

export interface Explanation {
  reasons: string[];
  missing: string[];
  nextSteps: string[];
  riskAlerts: string[];
}

export interface ScoredOpportunity {
  id: string;
  isOpportunity: boolean;
  type: string;
  title: string;
  organization?: string;
  deadline?: string;
  eligibility: string[];
  requirements: string[];
  location?: string;
  link?: string;
  urgencyHint?: string;
  sourceEmailText?: string;
  score: number;
  rank: number;
  scoreBreakdown: ScoreBreakdown;
  explanation: Explanation;
}

export interface RankedOpportunitiesResponse {
  opportunities: ScoredOpportunity[];
  totalProcessed: number;
  totalOpportunities: number;
  processedAt: string;
}
