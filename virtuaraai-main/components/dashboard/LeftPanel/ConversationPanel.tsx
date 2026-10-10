"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, RefreshCw, Brain, MessageSquare, Briefcase } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getSubjects, getObjectives, createSession, beginSession, submitTurn, saveMessage, completeSession } from "@/lib/api";

interface Message {
  id: number;
  role: "ai" | "user";
  content: string;
  timestamp: string;
}

type Mode = "chat" | "quiz";

function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

function nowStr() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

function MessageBubble({ msg }: { msg: Message }) {
  const isAI = msg.role === "ai";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-[10px] ${isAI ? "justify-start" : "justify-end"} mb-5`}
    >
      {isAI && (
        <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 bg-bg-surface border border-border-gold text-text-gold-deep shadow-sm">
          AI
        </div>
      )}
      <div className={`max-w-[85%] flex flex-col ${isAI ? "items-start" : "items-end"}`}>
        <div
          className="px-[18px] py-[12px] text-[15px] leading-relaxed shadow-sm font-medium antialiased whitespace-pre-wrap"
          style={
            isAI
              ? { background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: "4px 16px 16px 16px" }
              : { background: "var(--text-gold-deep)", border: "none", color: "white", borderRadius: "16px 4px 16px 16px" }
          }
        >
          {msg.content}
        </div>
        <p className="text-[10px] mt-2 px-1 font-mono text-text-tertiary uppercase tracking-wider font-bold">
          {msg.timestamp}
        </p>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-[12px] mb-6">
      <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 bg-bg-surface border border-border-gold text-text-gold-deep shadow-sm">
        AI
      </div>
      <div className="px-[18px] py-[14px] flex items-center gap-[4px] shadow-sm"
        style={{ background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", borderRadius: "4px 16px 16px 16px" }}>
        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
      </div>
    </div>
  );
}

interface ConversationPanelProps {
  onAISpeak?: (text: string) => void;
}

export default function ConversationPanel({ onAISpeak }: ConversationPanelProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const subject = searchParams?.get("subject") ?? "General Learning";
  const accessToken = (session as any)?.accessToken as string | undefined;

  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<any>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [teachingActive, setTeachingActive] = useState(false);
  const [objectiveTitle, setObjectiveTitle] = useState("");
  const [bootKey, setBootKey] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!subject || subject === "General Learning") return;
    getSubjects(accessToken).then((list) => {
      const match = list.find((s) => s.name === subject || s.slug === subject.toLowerCase().replace(/\s+/g, "-"));
      if (match) setSubjectId(match.id);
    }).catch(() => {});
  }, [subject, accessToken]);

  const makeWelcome = useCallback((m: Mode): Message => ({
    id: Date.now(),
    role: "ai",
    content: m === "quiz"
      ? `Quiz mode activated for **${subject}**! I'll ask you 5 questions and grade your answers. Ready? Here comes question 1:`
      : `Hello! I'm Aria, your AI mentor. Today we're exploring **${subject}**. What would you like to learn?`,
    timestamp: nowStr(),
  }), [subject]);

  useEffect(() => {
    let cancelled = false;
    setTeachingActive(false);
    setObjectiveTitle("");
    setSessionId(null);
    setQuizScore(0);
    setQuizDone(false);
    setError("");
    setMessages([makeWelcome(mode)]);

    if (mode !== "chat" || !accessToken || !subject || subject === "General Learning") {
      return;
    }

    (async () => {
      try {
        const list = await getSubjects(accessToken);
        const match = list.find((s) => s.name === subject || s.slug === subject.toLowerCase().replace(/\s+/g, "-"));
        if (!match || cancelled) return;
        setSubjectId(match.id);
        const requested = searchParams?.get("objective");
        const objectives = await getObjectives(match.slug, accessToken);
        const objective = objectives.find((item) => item.slug === requested) ?? objectives[0];
        if (!objective || cancelled) return;
        const sess = await createSession(
          { subject: match.id, objective: objective.id, session_type: "tutor" },
          accessToken
        );
        const started = await beginSession(sess.id, accessToken);
        if (cancelled) return;
        setSessionId(sess.id);
        setTeachingActive(true);
        setObjectiveTitle(objective.title);
        setMessages([{
          id: Date.now(),
          role: "ai",
          content: started.response_text,
          timestamp: nowStr(),
        }]);
      } catch {
        if (!cancelled) setTeachingActive(false);
      }
    })();

    return () => { cancelled = true; };
  }, [subject, mode, accessToken, makeWelcome, searchParams, bootKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Stop recognition when component unmounts
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const toggleListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setError("Voice input requires Chrome or Edge. Please switch browsers.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onstart = () => setListening(true);

    rec.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        setListening(false);
      }
    };

    rec.onerror = () => {
      setListening(false);
      setError("Microphone error. Check your browser permissions and try again.");
    };

    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
  }, [listening]);

  const ensureSession = async () => {
    if (sessionId || !accessToken) return sessionId;
    try {
      const data = await createSession(
        { subject: subjectId ?? undefined, session_type: mode === "quiz" ? "quiz" : "tutor" },
        accessToken
      );
      setSessionId(data.id);
      return data.id;
    } catch {
      return null;
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping || quizDone) return;

    // Stop voice if still running
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }

    const userMsg: Message = { id: Date.now(), role: "user", content: text, timestamp: nowStr() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);
    setError("");

    const sid = await ensureSession();
    if (sid && accessToken && !teachingActive) {
      saveMessage(sid, { role: "user", content: text }, accessToken).catch(() => {});
    }

    if (teachingActive && sid && accessToken) {
      try {
        const result = await submitTurn(
          sid,
          { content: text, client_turn_id: crypto.randomUUID() },
          accessToken
        );
        if (!result.ok) {
          const recovery = result.body.curriculum_recovery?.response_text;
          setError(result.body.message ?? "The model provider is unavailable. Your saved answer was not turned into a fake reply.");
          if (recovery) {
            const recoveryMsg: Message = {
              id: Date.now() + 1,
              role: "ai",
              content: `Curriculum recovery (this is not a model response):\n\n${recovery}`,
              timestamp: nowStr(),
            };
            setMessages((prev) => [...prev, recoveryMsg]);
          }
          return;
        }
        const aiMsg: Message = { id: Date.now() + 1, role: "ai", content: result.body.response_text, timestamp: nowStr() };
        setMessages((prev) => [...prev, aiMsg]);
        onAISpeak?.(result.body.response_text);
      } catch (err: any) {
        setError(err.message ?? "Something went wrong. Please try again.");
      } finally {
        setIsTyping(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          subject,
          level: "intermediate",
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI service error");

      const aiMsg: Message = { id: Date.now() + 1, role: "ai", content: data.response, timestamp: nowStr() };
      setMessages((prev) => [...prev, aiMsg]);
      onAISpeak?.(data.response);

      if (sid && accessToken) {
        saveMessage(sid, { role: "assistant", content: data.response }, accessToken).catch(() => {});
      }

      if (data.quizScore !== null && data.quizTotal !== null) {
        setQuizScore(data.quizScore);
        setQuizDone(true);
        if (sid && accessToken) {
          const pct = Math.round((data.quizScore / data.quizTotal) * 100);
          completeSession(sid, { score: pct, notes: `Quiz: ${data.quizScore}/${data.quizTotal}` }, accessToken).catch(() => {});
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const resetChat = async () => {
    if (sessionId && accessToken) {
      completeSession(sessionId, {}, accessToken).catch(() => {});
    }
    setSessionId(null);
    setMessages([makeWelcome(mode)]);
    setQuizScore(0);
    setQuizDone(false);
    setError("");
    setBootKey((key) => key + 1);
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    if (sessionId && accessToken) {
      completeSession(sessionId, {}, accessToken).catch(() => {});
    }
    setMode(m);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-subtle bg-bg-surface">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.12em] mb-0.5">Conversation</p>
            <h3 className="font-display font-bold tracking-tight text-text-heading text-[18px] truncate max-w-[200px]">{subject}</h3>
            {objectiveTitle && (
              <p className="text-[11px] font-semibold text-text-secondary truncate max-w-[220px]">{objectiveTitle}</p>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full animate-dot-pulse bg-semantic-success" />
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                {teachingActive ? "ARIA · CURRICULUM" : "ARIA · AI"}
                {sessionId && <span className="text-semantic-success ml-1">· SAVING</span>}
              </span>
            </div>
          </div>
          <button onClick={resetChat} title="New session"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-text-tertiary hover:text-text-gold-deep hover:bg-bg-overlay border border-transparent hover:border-border-subtle transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => switchMode("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              mode === "chat" ? "bg-text-gold-deep text-white" : "bg-bg-overlay text-text-tertiary hover:text-text-primary border border-border-subtle"
            }`}>
            <MessageSquare className="w-3 h-3" /> Chat
          </button>
          <button onClick={() => switchMode("quiz")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              mode === "quiz" ? "bg-text-gold-deep text-white" : "bg-bg-overlay text-text-tertiary hover:text-text-primary border border-border-subtle"
            }`}>
            <Brain className="w-3 h-3" /> Quiz Me
          </button>
          <button onClick={() => router.push("/dashboard/interview")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all bg-bg-overlay text-text-tertiary hover:text-text-primary border border-border-subtle hover:border-gold-500/40">
            <Briefcase className="w-3 h-3" /> Interview
          </button>
          {mode === "quiz" && !quizDone && (
            <div className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bg-overlay border border-border-subtle">
              <span className="text-[11px] font-bold text-text-gold-deep">{quizScore}</span>
              <span className="text-[11px] text-text-tertiary font-bold">pts</span>
            </div>
          )}
          {mode === "quiz" && quizDone && (
            <div className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-semantic-success-muted border border-semantic-success-border">
              <span className="text-[11px] font-bold text-semantic-success-text">Score: {quizScore}/5 ✓</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 custom-scrollbar">
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mx-2 mb-4 px-4 py-3 rounded-xl bg-semantic-error-muted border border-semantic-error-border text-[13px] font-bold text-semantic-error-text">
            ✕ {error}
            <button onClick={() => setError("")} className="ml-3 underline text-[11px]">Dismiss</button>
          </motion.div>
        )}

        {quizDone && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mx-2 mb-4 px-4 py-4 rounded-xl bg-semantic-success-muted border border-semantic-success-border text-center">
            <p className="text-[15px] font-bold text-semantic-success-text mb-2">Quiz Complete! Score: {quizScore}/5</p>
            <button onClick={resetChat}
              className="px-4 py-2 rounded-lg bg-text-gold-deep text-white text-[12px] font-bold hover:bg-[#4A3200] transition-all">
              Start New Session
            </button>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-5 bg-bg-surface/60 backdrop-blur-md border-t border-border-default relative z-20">
        <div className="flex items-end gap-[12px]">
          <button
            onClick={toggleListening}
            title={listening ? "Stop listening" : "Start voice input"}
            className="w-[46px] h-[46px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
            style={{
              background: listening ? "var(--color-error-muted)" : "var(--bg-overlay)",
              border: listening ? "1px solid var(--color-error-border)" : "1px solid var(--border-subtle)",
            }}>
            {listening
              ? <MicOff className="w-[18px] h-[18px] text-semantic-error-text" />
              : <Mic className="w-[18px] h-[18px] text-text-tertiary" />
            }
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={quizDone ? "Quiz complete — start a new session" : mode === "quiz" ? "Type your answer..." : "Ask Aria anything..."}
            disabled={quizDone}
            rows={1}
            className="flex-1 resize-none px-[18px] py-[13px] rounded-xl text-[14px] text-text-primary placeholder:text-text-placeholder transition-all duration-220 bg-bg-overlay border border-border-default focus:border-gold-300 focus:shadow-[0_0_0_4px_rgba(201,168,76,0.06)] outline-none disabled:opacity-40"
            style={{ maxHeight: 120 }}
          />

          <button onClick={sendMessage} disabled={!input.trim() || isTyping || quizDone}
            className="w-[46px] h-[46px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-220 disabled:opacity-30 disabled:cursor-not-allowed bg-text-gold-deep hover:translate-y-[-1px] hover:shadow-md active:translate-y-[0px]">
            <Send className="w-[18px] h-[18px] text-white ml-[2px]" />
          </button>
        </div>
        {listening && (
          <div className="flex items-center gap-2 mt-3 pl-[58px]">
            <span className="flex gap-0.5">
              {[1,2,3,4].map(i => (
                <span key={i} className="w-0.5 rounded-full bg-semantic-error-text animate-pulse"
                  style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </span>
            <p className="text-[10px] font-bold text-semantic-error-text tracking-widest uppercase">Listening — speak now</p>
          </div>
        )}
      </div>
    </div>
  );
}
