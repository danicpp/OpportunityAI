import type {
  StudentProfile,
  StudentProfileInput,
  ScoredOpportunity,
  RankedOpportunitiesResponse,
} from "./types";

const BASE = "/api";

function getProfileId(): string | null {
  return localStorage.getItem("session_profileId");
}

async function req<T>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${method} ${path} failed: ${res.status} — ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getProfile: () => {
    const pid = getProfileId();
    const qs = pid ? `?profileId=${encodeURIComponent(pid)}` : "";
    return req<StudentProfile>(`/profile${qs}`);
  },
  saveProfile: (data: StudentProfileInput) => {
    const pid = getProfileId();
    const qs = pid ? `?profileId=${encodeURIComponent(pid)}` : "";
    return req<StudentProfile>(`/profile${qs}`, "PUT", data);
  },

  extractOpportunities: (emails: string[], profileId?: string) =>
    req<RankedOpportunitiesResponse>("/extract", "POST", { emails, profileId }),

  getOpportunities: () => {
    const pid = getProfileId();
    const qs = pid ? `?profileId=${encodeURIComponent(pid)}` : "";
    return req<{ opportunities: ScoredOpportunity[] }>(`/opportunities${qs}`);
  },

  clearOpportunities: () => {
    const pid = getProfileId();
    const qs = pid ? `?profileId=${encodeURIComponent(pid)}` : "";
    return req<void>(`/opportunities${qs}`, "DELETE");
  },
};
