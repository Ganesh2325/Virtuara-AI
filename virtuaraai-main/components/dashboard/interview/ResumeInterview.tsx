"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAria } from "@/components/aria/AriaProvider";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const DURATIONS = [10, 15, 20, 25, 30];

type ResumeState = {
  id: string;
  status: string;
  profile?: { skills?: string[]; projects?: string[] };
  error?: string;
};

type InterviewState = {
  id: string;
  status: string;
  remaining_seconds: number;
  response_text?: string;
  current_prompt?: string;
  completed?: boolean;
  avatar?: { live_stream: boolean; note: string; state: string };
  report?: ReportState;
};

type ReportState = {
  completed: boolean;
  actual_minutes: number;
  configured_minutes: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  disclaimer: string;
};

async function api(path: string, token: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  return { ok: res.ok, status: res.status, body };
}

export default function ResumeInterview() {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const aria = useAria();
  const [file, setFile] = useState<File | null>(null);
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [role, setRole] = useState("Backend engineer");
  const [kind, setKind] = useState("technical");
  const [minutes, setMinutes] = useState(10);
  const [interview, setInterview] = useState<InterviewState | null>(null);
  const [answer, setAnswer] = useState("");
  const [report, setReport] = useState<ReportState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!interview || interview.status !== "running") return;
    setRemaining(interview.remaining_seconds);
    const timer = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [interview]);

  useEffect(() => {
    if (!interview?.id) return;
    aria.setTask({ kind: "interview", interviewSessionId: interview.id });
    return () => aria.clearTask("interview");
  }, [aria.setTask, aria.clearTask, interview?.id]);

  useEffect(() => {
    return aria.registerHandler((turn) => {
      if (turn.context !== "interview") return;
      const body = turn.body as InterviewState;
      setInterview(body);
      if (body.report) setReport(body.report);
      if (!turn.ok) setError(typeof turn.body.message === "string" ? turn.body.message : "The spoken answer was not saved.");
    });
  }, [aria.registerHandler]);

  useEffect(() => {
    if (!token || !resume || resume.status !== "processing") return;
    let stopped = false;
    const timer = window.setInterval(async () => {
      const result = await api(`/api/v1/interviews/resumes/${resume.id}/`, token);
      if (!stopped && result.ok) setResume(result.body);
    }, 1500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [token, resume]);

  if (!token) {
    return (
      <div className="h-full flex items-center justify-center px-8 text-center">
        <p className="text-[15px] font-medium text-text-secondary">Sign in to upload a resume and start a timed interview.</p>
      </div>
    );
  }

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setReport(null);
    const body = new FormData();
    body.set("file", file);
    const result = await api("/api/v1/interviews/resumes/", token, { method: "POST", body });
    setBusy(false);
    if (!result.ok && result.status !== 200) {
      setError(result.body.message ?? "The resume could not be uploaded.");
      if (result.body.resume) setResume(result.body.resume);
      return;
    }
    setResume(result.body);
  };

  const refreshResume = async () => {
    if (!resume) return;
    const result = await api(`/api/v1/interviews/resumes/${resume.id}/`, token);
    if (result.ok) setResume(result.body);
  };

  const start = async () => {
    if (!resume || resume.status !== "ready") return;
    setBusy(true);
    setError("");
    const result = await api("/api/v1/interviews/sessions/", token, {
      method: "POST",
      body: JSON.stringify({
        resume_id: resume.id,
        target_role: role,
        interview_type: kind,
        duration_minutes: minutes,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.body.message ?? "The interview could not start.");
      return;
    }
    setInterview(result.body);
  };

  const send = async () => {
    if (!interview || !answer.trim()) return;
    setBusy(true);
    setError("");
    const result = await api(`/api/v1/interviews/sessions/${interview.id}/answers/`, token, {
      method: "POST",
      body: JSON.stringify({ content: answer.trim(), client_turn_id: crypto.randomUUID() }),
    });
    setBusy(false);
    setAnswer("");
    if (!result.ok) {
      setError(result.body.message ?? "The answer was not saved.");
      return;
    }
    setInterview(result.body);
    if (result.body.report) setReport(result.body.report);
  };

  const abort = async () => {
    if (!interview) return;
    const result = await api(`/api/v1/interviews/sessions/${interview.id}/abort/`, token, { method: "POST", body: "{}" });
    if (result.ok) {
      setInterview(result.body);
      const saved = await api(`/api/v1/interviews/sessions/${interview.id}/report/`, token);
      if (saved.ok) setReport(saved.body);
    }
  };

  const prompt = interview?.response_text || interview?.current_prompt || "";

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">Aria</p>
          <p className="text-[14px] font-medium text-text-primary mt-1">
            Development avatar — {interview?.avatar?.state ?? "idle"}. Not a live MetaHuman video stream.
          </p>
        </div>

        {!interview && (
          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6 space-y-4">
            <h2 className="font-display text-[24px] font-bold text-text-heading">Resume interview</h2>
            <p className="text-[14px] text-text-secondary">
              Upload a .txt, .pdf, or .docx resume. The interview starts only after the file is parsed, and it can last 10 to 30 minutes.
            </p>
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="text-[13px] text-text-secondary"
            />
            <button onClick={upload} disabled={!file || busy} className="px-4 py-2 rounded-xl bg-text-gold-deep text-white text-[13px] font-bold disabled:opacity-40">
              Upload resume
            </button>
            {resume && (
              <div className="text-[13px] text-text-primary space-y-2">
                <p>Status: {resume.status}</p>
                {resume.error && <p>{resume.error}</p>}
                {resume.profile?.skills && <p>Skills read from the file: {resume.profile.skills.join(", ")}</p>}
                {resume.status === "processing" && (
                  <button onClick={refreshResume} className="underline text-text-gold-deep">Check parsing status</button>
                )}
              </div>
            )}
            {resume?.status === "ready" && (
              <div className="grid gap-3">
                <input value={role} onChange={(event) => setRole(event.target.value)} className="px-3 py-2 rounded-xl border border-border-default bg-bg-overlay" placeholder="Target role" />
                <select value={kind} onChange={(event) => setKind(event.target.value)} className="px-3 py-2 rounded-xl border border-border-default bg-bg-overlay">
                  <option value="technical">Technical</option>
                  <option value="project">Project deep dive</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="mixed">Mixed</option>
                </select>
                <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="px-3 py-2 rounded-xl border border-border-default bg-bg-overlay">
                  {DURATIONS.map((value) => <option key={value} value={value}>{value} minutes</option>)}
                </select>
                <button onClick={start} disabled={busy} className="px-4 py-2 rounded-xl bg-text-gold-deep text-white text-[13px] font-bold disabled:opacity-40">
                  Start interview
                </button>
              </div>
            )}
          </div>
        )}

        {interview && !report && (
          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6 space-y-4">
            <p className="text-[12px] font-bold text-text-tertiary uppercase tracking-widest">
              {interview.status} · {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} left
            </p>
            <p className="text-[16px] leading-relaxed text-text-primary whitespace-pre-wrap">{prompt}</p>
            <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={4} className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-overlay" placeholder="Type your answer" />
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => {
                  if (!aria.active) aria.start();
                  if (prompt) aria.speak(prompt);
                }}
                className="px-4 py-2 rounded-xl border border-border-subtle text-[13px] font-bold"
              >
                {aria.avatarState === "listening" ? "Listening" : "Speak with Aria"}
              </button>
              <button onClick={send} disabled={busy || !answer.trim()} className="px-4 py-2 rounded-xl bg-text-gold-deep text-white text-[13px] font-bold disabled:opacity-40">
                Send answer
              </button>
              <button onClick={abort} className="px-4 py-2 rounded-xl border border-border-subtle text-[13px] font-bold">
                Stop interview
              </button>
            </div>
          </div>
        )}

        {report && (
          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6 space-y-3">
            <h2 className="font-display text-[24px] font-bold text-text-heading">{report.completed ? "Practice report" : "Stopped early"}</h2>
            <p className="text-[14px] text-text-primary">{report.summary}</p>
            <p className="text-[13px] text-text-secondary">{report.disclaimer}</p>
            <p className="text-[13px]">Recorded time: {report.actual_minutes} min · Configured: {report.configured_minutes} min</p>
            <div>
              <p className="font-bold text-[12px] uppercase tracking-widest text-text-tertiary">Strengths</p>
              <ul>{report.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <p className="font-bold text-[12px] uppercase tracking-widest text-text-tertiary">Improve</p>
              <ul>{report.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        )}

        {error && <p className="text-[13px] font-bold text-semantic-error-text">{error}</p>}
      </div>
    </div>
  );
}
