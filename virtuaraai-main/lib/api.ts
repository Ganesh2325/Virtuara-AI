const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ApiError = { status: number; message: string };

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail ?? body.error ?? JSON.stringify(body);
    } catch {}
    throw { status: res.status, message } as ApiError;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: "GET" }, token),

  post: <T>(path: string, data: unknown, token?: string) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }, token),

  patch: <T>(path: string, data: unknown, token?: string) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }, token),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: "DELETE" }, token),
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface DjangoUser {
  id: string;
  email: string;
  full_name: string;
  profile_picture: string | null;
  is_email_verified: boolean;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export function registerUser(data: {
  email: string;
  full_name: string;
  password: string;
  password_confirm: string;
}) {
  return api.post<{ message: string; user: DjangoUser; tokens: AuthTokens }>(
    "/api/v1/auth/register/",
    data
  );
}

export function forgotPassword(email: string) {
  return api.post<{ message: string }>("/api/v1/auth/forgot-password/", { email });
}

export function resetPassword(token: string, new_password: string) {
  return api.post<{ message: string }>("/api/v1/auth/reset-password/", {
    token,
    new_password,
  });
}

export function getMe(token: string) {
  return api.get<DjangoUser>("/api/v1/auth/me/", token);
}

// ── Subjects ─────────────────────────────────────────────────────────────────

export interface DjangoSubject {
  id: string;
  name: string;
  slug: string;
  category: string;
  icon: string;
  description: string;
  order: number;
  module_count: number;
}

export function getSubjects(token?: string) {
  return api.get<DjangoSubject[]>("/api/v1/subjects/", token);
}

export function getSubject(slug: string, token?: string) {
  return api.get<DjangoSubject>(`/api/v1/subjects/${slug}/`, token);
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export interface DjangoSession {
  id: string;
  subject: string | null;          // UUID (write) / FK id (read)
  subject_name: string | null;
  subject_icon: string | null;
  subject_slug: string | null;
  module: string | null;
  module_title: string | null;
  status: "pending" | "active" | "completed" | "interrupted";
  session_type: "tutor" | "quiz" | "practice" | "review";
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  score: number | null;
  message_count: number;
}

export function getSessions(token: string, params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return api.get<{ results: DjangoSession[]; count: number }>(
    `/api/v1/sessions/${qs}`,
    token
  );
}

export interface LearningObjectiveSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  module_title: string;
}

export interface TeachingTurn {
  action: string;
  response_text: string;
  model_response: string | null;
  error?: string;
  message?: string;
  recoverable?: boolean;
  duplicate?: boolean;
  curriculum_recovery?: { response_text: string; provider?: { name: string; used: boolean } };
  mastery?: { status: string; estimate: number; confidence: number; evidence_count: number; explanation?: string };
  sources?: { title: string; source_label: string; excerpt: string }[];
  learning_objective?: { id: string; slug: string; title: string };
}

export function getObjectives(slug: string, token?: string) {
  return api.get<LearningObjectiveSummary[]>(`/api/v1/subjects/${slug}/objectives/`, token);
}

export function createSession(
  data: { subject?: string; objective?: string; session_type?: string },
  token: string
) {
  return api.post<DjangoSession>("/api/v1/sessions/", data, token);
}

export function beginSession(sessionId: string, token: string) {
  return api.post<TeachingTurn>(`/api/v1/sessions/${sessionId}/begin/`, {}, token);
}

export async function submitTurn(
  sessionId: string,
  data: { content: string; client_turn_id: string; request_model?: boolean },
  token: string
): Promise<{ ok: boolean; status: number; body: TeachingTurn }> {
  const res = await fetch(`${BASE}/api/v1/sessions/${sessionId}/turns/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const body = (await res.json()) as TeachingTurn;
  return { ok: res.ok, status: res.status, body };
}

export function completeSession(
  sessionId: string,
  data: { score?: number; notes?: string },
  token: string
) {
  return api.post<DjangoSession>(`/api/v1/sessions/${sessionId}/complete/`, data, token);
}

export function saveMessage(
  sessionId: string,
  data: { role: "user" | "assistant"; content: string; tokens_used?: number },
  token: string
) {
  return api.post<{ id: string }>(`/api/v1/sessions/${sessionId}/messages/`, data, token);
}

export function getSessionStats(token: string) {
  return api.get<{
    total_sessions: number;
    total_study_minutes: number;
    streak_days: number;
    average_score: number | null;
    sessions_this_week: number;
    favourite_subject: string | null;
  }>("/api/v1/sessions/stats/", token);
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export interface DjangoPlan {
  id: string;
  name: string;
  slug: string;
  monthly_price: string;
  annual_price: string;
  features: string[];
  max_sessions_per_day: number | null;
}

export function getPlans() {
  return api.get<DjangoPlan[]>("/api/v1/subscriptions/plans/");
}
