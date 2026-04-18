/**
 * Firestore REST API client — no gRPC, no native deps, works with esbuild.
 * Uses the Firestore REST API v1 with the project API key for auth.
 */

const PROJECT_ID = "ai-hackathon-mvp";
const API_KEY = process.env.FIRESTORE_API_KEY!;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StudentProfile {
  id: string;
  degree?: string | null;
  semester?: number | null;
  cgpa?: number | null;
  skills: string[];
  interests: string[];
  preferredTypes: string[];
  locationPreference?: string | null;
  financialNeed?: boolean | null;
  updatedAt: string;
}

export interface OpportunityRecord {
  id: string;
  profileId?: string | null;
  type: string;
  title: string;
  organization?: string | null;
  deadline?: string | null;
  eligibility: string[];
  requirements: string[];
  location?: string | null;
  link?: string | null;
  urgencyHint?: string | null;
  score: number;
  rank: number;
  scoreBreakdown: Record<string, number>;
  explanation: Record<string, unknown>;
  sourceEmailText?: string | null;
  createdAt: string;
}

// ─── Firestore value encoding/decoding ───────────────────────────────────────

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

function encode(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(encode) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = encode(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function decode(val: FirestoreValue): unknown {
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("stringValue" in val) return val.stringValue;
  if ("arrayValue" in val) {
    return (val.arrayValue.values ?? []).map(decode);
  }
  if ("mapValue" in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields ?? {})) {
      out[k] = decode(v);
    }
    return out;
  }
  return null;
}

function encodeDoc(obj: Record<string, unknown>): { fields: Record<string, FirestoreValue> } {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = encode(v);
  }
  return { fields };
}

function decodeDoc(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = decode(v);
  }
  return out;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function firestoreGet(path: string) {
  const url = `${BASE_URL}/${path}?key=${API_KEY}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function firestorePatch(path: string, body: unknown) {
  const url = `${BASE_URL}/${path}?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore PATCH ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function firestoreDelete(path: string) {
  const url = `${BASE_URL}/${path}?key=${API_KEY}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Firestore DELETE ${path} failed: ${res.status} ${text}`);
  }
}

async function firestoreList(collection: string): Promise<Array<{ id: string; fields: Record<string, FirestoreValue> }>> {
  const url = `${BASE_URL}/${collection}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore LIST ${collection} failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as any;
  if (!data.documents) return [];
  return data.documents.map((d: any) => ({
    id: d.name.split("/").pop(),
    fields: d.fields ?? {},
  }));
}

// ─── Profile operations ───────────────────────────────────────────────────────

export async function getProfile(id = "default"): Promise<StudentProfile | null> {
  const doc = (await firestoreGet(`profiles/${id}`)) as any;
  if (!doc || !doc.fields) return null;
  const d = decodeDoc(doc.fields);
  return {
    id,
    degree: (d.degree as string) ?? null,
    semester: (d.semester as number) ?? null,
    cgpa: (d.cgpa as number) ?? null,
    skills: (d.skills as string[]) ?? [],
    interests: (d.interests as string[]) ?? [],
    preferredTypes: (d.preferredTypes as string[]) ?? [],
    locationPreference: (d.locationPreference as string) ?? null,
    financialNeed: (d.financialNeed as boolean) ?? null,
    updatedAt: (d.updatedAt as string) ?? new Date().toISOString(),
  };
}

export async function saveProfile(profile: Omit<StudentProfile, "updatedAt">): Promise<StudentProfile> {
  const updatedAt = new Date().toISOString();
  const data = { ...profile, updatedAt };
  await firestorePatch(`profiles/${profile.id}`, encodeDoc(data as any));
  return data;
}

// ─── Opportunity operations ───────────────────────────────────────────────────

export async function getOpportunities(profileId?: string): Promise<OpportunityRecord[]> {
  const docs = await firestoreList("opportunities");
  return docs
    .map((d) => {
      const data = decodeDoc(d.fields);
      return {
        id: d.id,
        profileId: (data.profileId as string) ?? null,
        type: (data.type as string) ?? "other",
        title: (data.title as string) ?? "Untitled",
        organization: (data.organization as string) ?? null,
        deadline: (data.deadline as string) ?? null,
        eligibility: (data.eligibility as string[]) ?? [],
        requirements: (data.requirements as string[]) ?? [],
        location: (data.location as string) ?? null,
        link: (data.link as string) ?? null,
        urgencyHint: (data.urgencyHint as string) ?? null,
        score: (data.score as number) ?? 0,
        rank: (data.rank as number) ?? 0,
        scoreBreakdown: (data.scoreBreakdown as Record<string, number>) ?? {},
        explanation: (data.explanation as Record<string, unknown>) ?? {},
        sourceEmailText: (data.sourceEmailText as string) ?? null,
        createdAt: (data.createdAt as string) ?? new Date().toISOString(),
      } satisfies OpportunityRecord;
    })
    .filter(o => !profileId || o.profileId === profileId)
    .sort((a, b) => a.rank - b.rank);
}

export async function appendOpportunities(opps: OpportunityRecord[]): Promise<void> {
  // Write new docs
  await Promise.all(
    opps.map((opp) => firestorePatch(`opportunities/${opp.id}`, encodeDoc(opp as any)))
  );
}

export async function clearOpportunities(profileId?: string): Promise<void> {
  const existing = await firestoreList("opportunities");
  const toDelete = existing.filter((d) => {
    if (!profileId) return true;
    const decoded = decodeDoc(d.fields);
    return decoded.profileId === profileId;
  });
  await Promise.all(toDelete.map((d) => firestoreDelete(`opportunities/${d.id}`)));
}

// ─── User Authentication ───────────────────────────────────────────────────────

export interface UserRecord {
  id: string; // The username acts as the ID
  username: string;
  passwordHash: string; // Hashed with crypto
  profileId: string;
  createdAt: string;
}

export async function getUser(username: string): Promise<UserRecord | null> {
  const doc = (await firestoreGet(`users/${username}`)) as any;
  if (!doc || !doc.fields) return null;
  const d = decodeDoc(doc.fields);
  return {
    id: username,
    username: (d.username as string) ?? "",
    passwordHash: (d.passwordHash as string) ?? "",
    profileId: (d.profileId as string) ?? "",
    createdAt: (d.createdAt as string) ?? "",
  };
}

export async function createUser(user: UserRecord): Promise<void> {
  await firestorePatch(`users/${user.username}`, encodeDoc(user as any));
}

