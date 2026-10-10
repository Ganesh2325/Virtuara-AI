"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Mic, MicOff, Volume2, VolumeX,
  X, Play, Pause, CheckCircle, Code2, Send, RotateCcw,
  Briefcase, ChevronRight, AlertCircle, Download,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

// Load Monaco only client-side (it's heavy)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSR(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

function nowStr() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

function speak(text: string, muted: boolean, onDone?: () => void) {
  if (typeof window === "undefined" || muted) { onDone?.(); return; }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 0.95;
  utter.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const female = voices.find(v =>
    v.lang.startsWith("en") && /female|woman|samantha|karen|victoria|zira|moira/i.test(v.name)
  ) ?? voices.find(v => v.lang.startsWith("en")) ?? null;
  if (female) utter.voice = female;
  utter.onend = () => onDone?.();
  utter.onerror = () => onDone?.();
  window.speechSynthesis.speak(utter);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message { role: "ai" | "user"; content: string; time: string; }
type Phase = "upload" | "interview" | "complete";

interface Report {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  verdict: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpeakingWave({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] justify-center h-8">
      {[12, 20, 28, 20, 12].map((h, i) => (
        <div key={i} className="w-[3px] rounded-sm bg-text-gold-deep/80 transition-all duration-300"
          style={{
            height: active ? h : 3,
            animation: active ? `soundWave 0.8s ease-in-out ${i * 0.1}s infinite` : "none",
          }} />
      ))}
    </div>
  );
}

function FaceOverlay({ detected }: { detected: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Corner brackets */}
      {[
        "top-4 left-4 border-t-2 border-l-2 rounded-tl-lg",
        "top-4 right-4 border-t-2 border-r-2 rounded-tr-lg",
        "bottom-4 left-4 border-b-2 border-l-2 rounded-bl-lg",
        "bottom-4 right-4 border-b-2 border-r-2 rounded-br-lg",
      ].map((cls, i) => (
        <div key={i} className={`absolute w-6 h-6 ${cls} transition-colors duration-500`}
          style={{ borderColor: detected ? "var(--color-success-text)" : "var(--color-warning-text)" }} />
      ))}
      {/* Status */}
      <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all duration-500 ${
        detected ? "bg-semantic-success-muted border border-semantic-success-border text-semantic-success-text"
                 : "bg-semantic-warning-muted border border-semantic-warning-border text-semantic-warning-text"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${detected ? "bg-semantic-success-text animate-pulse" : "bg-semantic-warning-text"}`} />
        {detected ? "Face detected" : "No face detected"}
      </div>
    </div>
  );
}

// ─── Upload Phase ─────────────────────────────────────────────────────────────

function UploadPhase({ onStart }: { onStart: (text: string) => void }) {
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    if (!file) return;
    if (file.size > 1024 * 1024 * 5) { setError("File too large (max 5MB)."); return; }
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx")) {
      setError("PDF/DOC files can't be read as text — please paste your resume content in the box below instead.");
      setFileName("");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setResumeText(text ?? "");
      setError("");
    };
    reader.onerror = () => setError("Could not read file.");
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-16 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-border-gold flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-8 h-8 text-text-gold-deep" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-[36px] font-bold text-text-heading tracking-tight mb-3">AI Mock Interview</h1>
          <p className="text-text-secondary text-[15px] font-medium max-w-md mx-auto leading-relaxed">
            Upload your resume and Aria will conduct a realistic technical interview — with live face detection and a built-in code editor.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 mb-6"
          style={{
            borderColor: dragging ? "var(--text-gold-deep)" : fileName ? "var(--color-success-text)" : "var(--border-subtle)",
            background: dragging ? "var(--bg-overlay)" : "var(--bg-surface)",
          }}
        >
          <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
          {fileName ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="w-10 h-10 text-semantic-success-text" strokeWidth={1.5} />
              <p className="font-bold text-text-heading text-[15px]">{fileName}</p>
              <p className="text-text-tertiary text-[12px]">Click to change file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-text-tertiary" strokeWidth={1.5} />
              <p className="font-bold text-text-secondary text-[15px]">Drop your resume here</p>
              <p className="text-text-tertiary text-[12px]">TXT files up to 5MB — or paste below for PDF/DOC</p>
            </div>
          )}
        </div>

        {/* Paste fallback */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Or paste resume text</p>
          <textarea
            value={resumeText}
            onChange={e => { setResumeText(e.target.value); setFileName(""); }}
            placeholder="Paste your resume content here..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl text-[13px] bg-bg-overlay border border-border-subtle text-text-primary placeholder:text-text-placeholder outline-none focus:border-gold-300 resize-none custom-scrollbar"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-semantic-error-muted border border-semantic-error-border">
            <AlertCircle className="w-4 h-4 text-semantic-error-text flex-shrink-0" />
            <p className="text-[13px] font-bold text-semantic-error-text">{error}</p>
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStart(resumeText)}
          className="w-full h-14 rounded-2xl text-[15px] font-bold text-white flex items-center justify-center gap-3 transition-all shadow-lg"
          style={{ background: "var(--text-gold-deep)" }}
        >
          <Play className="w-5 h-5" />
          Start Interview
          <ChevronRight className="w-4 h-4" />
        </motion.button>

        <p className="text-center text-[11px] text-text-tertiary font-medium mt-4">
          Resume upload is optional — Aria will adapt the interview accordingly.
        </p>
      </motion.div>
    </div>
  );
}

// ─── Code Editor Panel ────────────────────────────────────────────────────────

function CodePanel({
  challenge,
  onSubmit,
  onClose,
}: {
  challenge: string;
  onSubmit: (code: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("// Write your solution here\n\n");
  const [language, setLanguage] = useState("javascript");

  const langs = ["javascript", "python", "java", "cpp", "typescript"];

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="absolute inset-0 z-50 flex flex-col bg-[#1e1e1e] overflow-hidden"
      style={{ borderTop: "2px solid var(--border-gold)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#252526]">
        <div className="flex items-center gap-3">
          <Code2 className="w-4 h-4 text-text-gold-deep" />
          <span className="text-[13px] font-bold text-white">Code Challenge</span>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="ml-4 px-2 py-1 rounded text-[11px] font-bold bg-white/10 text-white border border-white/20 outline-none"
          >
            {langs.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Challenge prompt */}
      <div className="px-6 py-3 bg-[#2d2d2d] border-b border-white/10">
        <p className="text-[12px] text-white/80 leading-relaxed font-mono">{challenge}</p>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={language}
          value={code}
          onChange={v => setCode(v ?? "")}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            padding: { top: 12 },
          }}
        />
      </div>

      {/* Submit bar */}
      <div className="flex items-center justify-end gap-3 px-6 py-3 bg-[#252526] border-t border-white/10">
        <button
          onClick={() => setCode("// Write your solution here\n\n")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold text-white/60 hover:text-white border border-white/20 hover:border-white/40 transition-all"
        >
          <RotateCcw className="w-3 h-3" /> Clear
        </button>
        <button
          onClick={() => onSubmit(code)}
          className="flex items-center gap-2 px-6 py-2 rounded-lg text-[13px] font-bold text-white transition-all shadow-lg"
          style={{ background: "var(--text-gold-deep)" }}
        >
          <Send className="w-3.5 h-3.5" /> Submit Code
        </button>
      </div>
    </motion.div>
  );
}

// ─── Interview Phase ──────────────────────────────────────────────────────────

function InterviewPhase({
  resumeText,
  onComplete,
  candidateName,
}: {
  resumeText: string;
  onComplete: (report: Report | null) => void;
  candidateName: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [ariaState, setAriaState] = useState<"idle" | "speaking" | "listening" | "thinking">("idle");
  const [currentAriaText, setCurrentAriaText] = useState("");
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [codeChallenge, setCodeChallenge] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [camError, setCamError] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState("");
  const srAvailable = getSR() !== null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const mutedRef = useRef(false);
  const pausedRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ariaStateRef = useRef<"idle" | "speaking" | "listening" | "thinking">("idle");
  const candidateNameRef = useRef(candidateName);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { ariaStateRef.current = ariaState; }, [ariaState]);
  useEffect(() => { candidateNameRef.current = candidateName; }, [candidateName]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Webcam + face detection
  useEffect(() => {
    let stream: MediaStream | null = null;
    let faceInterval: ReturnType<typeof setInterval> | null = null;

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        // Face detection + gaze heuristic + spoken notifications
        let noFaceCount = 0;
        let lookAwayCount = 0;
        let lastNotifTime = 0;

        faceInterval = setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < 2) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          canvas.width = 80;
          canvas.height = 60;
          ctx.drawImage(video, 0, 0, 80, 60);
          const data = ctx.getImageData(0, 0, 80, 60).data;

          let totalSkin = 0, centerSkin = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - b > 15) {
              totalSkin++;
              const idx = i / 4;
              const px = idx % 80, py = Math.floor(idx / 80);
              if (px >= 20 && px <= 60 && py >= 10 && py <= 50) centerSkin++;
            }
          }

          const detected = totalSkin > 150;
          // Heuristic: face in frame but mostly at edges → looking away
          const lookingAway = detected && centerSkin < totalSkin * 0.28;
          setFaceDetected(detected);

          const now = Date.now();
          const canNotify = ariaStateRef.current !== "speaking" && ariaStateRef.current !== "thinking"
                         && now - lastNotifTime > 18000;

          if (!detected) {
            noFaceCount++;
            lookAwayCount = 0;
            // Notify after ~5 s of no face (5000 / 1200 ≈ 4 ticks)
            if (noFaceCount >= 4 && canNotify) {
              lastNotifTime = now;
              noFaceCount = 0;
              speak(`${candidateNameRef.current}, your face is not detected. Please look directly at the camera.`, mutedRef.current);
            }
          } else if (lookingAway) {
            lookAwayCount++;
            noFaceCount = 0;
            if (lookAwayCount >= 3 && canNotify) {
              lastNotifTime = now;
              lookAwayCount = 0;
              speak(`${candidateNameRef.current}, it looks like you're looking at your surroundings. Please face the camera.`, mutedRef.current);
            }
          } else {
            noFaceCount = 0;
            lookAwayCount = 0;
          }
        }, 1200);
      })
      .catch(() => setCamError(true));

    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (faceInterval) clearInterval(faceInterval);
    };
  }, []);

  // Call AI and get Aria's response
  const callAI = useCallback(async (userMessage: string) => {
    setAriaState("thinking");
    const history = messagesRef.current;

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
          ],
          resumeText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { response, isCodeChallenge, challenge, isComplete, report } = data;

      // Store challenge text in the message so API history has full context for evaluation
      const ariaContent = isCodeChallenge && challenge ? `${response}\n\n${challenge}` : response;
      const ariaMsg: Message = { role: "ai", content: ariaContent, time: nowStr() };
      setMessages(prev => [...prev, ariaMsg]);
      setCurrentAriaText(response);

      if (isCodeChallenge && challenge) setCodeChallenge(challenge);
      if (isComplete) {
        setAriaState("speaking");
        speak(response, mutedRef.current, () => onComplete(report));
        return;
      }

      setAriaState("speaking");
      speak(response, mutedRef.current, () => {
        setAriaState("idle");
        if (!pausedRef.current && !isCodeChallenge) startListening();
      });
    } catch {
      const err = "I had a connection issue. Please try again.";
      setCurrentAriaText(err);
      setAriaState("speaking");
      speak(err, mutedRef.current, () => setAriaState("idle"));
    }
  }, [resumeText, onComplete]);

  const startListening = useCallback(() => {
    const SR = getSR();
    if (!SR || pausedRef.current) return;
    setAriaState("listening");
    setIsListening(true);
    setTranscript("");

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = async (event: any) => {
      const text: string = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript).join("");
      setTranscript(text);

      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
        setAriaState("thinking");
        const userMsg: Message = { role: "user", content: text, time: nowStr() };
        setMessages(prev => [...prev, userMsg]);
        await callAI(text);
      }
    };

    rec.onerror = () => { setIsListening(false); setAriaState("idle"); };
    rec.onend = () => { setIsListening(false); };

    recognitionRef.current = rec;
    rec.start();
  }, [callAI]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setAriaState("idle");
  };

  // Kick off the interview on mount
  useEffect(() => {
    const genericOpeners = [
      "Hello! Welcome to your mock interview. Could you start by briefly introducing yourself and your background?",
      "Hi there! Let's get started. Tell me about yourself — what's your background and what kind of work excites you most?",
      "Welcome! I'm glad you're here. To kick things off, could you walk me through your experience and what you're passionate about?",
    ];
    const opener = resumeText
      ? "Hello! I've reviewed your resume. Let's begin — could you walk me through your background and a project you're particularly proud of?"
      : genericOpeners[Math.floor(Math.random() * genericOpeners.length)];

    const openMsg: Message = { role: "ai", content: opener, time: nowStr() };
    setMessages([openMsg]);
    setCurrentAriaText(opener);

    // Wait for voices to load
    setTimeout(() => {
      setAriaState("speaking");
      speak(opener, mutedRef.current, () => {
        setAriaState("idle");
        startListening();
      });
    }, 500);

    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCodeSubmit = async (code: string) => {
    const activeChallenge = codeChallenge; // capture before clearing
    setCodeChallenge(null);
    const userMsg: Message = { role: "user", content: `\`\`\`\n${code}\n\`\`\``, time: nowStr() };
    setMessages(prev => [...prev, userMsg]);
    const submission = activeChallenge
      ? `I am submitting my solution to the coding challenge.\n\nThe challenge was:\n${activeChallenge}\n\nMy code:\n\`\`\`\n${code}\n\`\`\`\n\nPlease evaluate it with test cases, complexity, and feedback.`
      : `Here is my code solution:\n\`\`\`\n${code}\n\`\`\``;
    await callAI(submission);
  };

  const handleTextSend = async () => {
    const text = textInput.trim();
    if (!text || ariaState === "thinking" || ariaState === "speaking") return;
    recognitionRef.current?.stop();
    setIsListening(false);
    setTextInput("");
    const userMsg: Message = { role: "user", content: text, time: nowStr() };
    setMessages(prev => [...prev, userMsg]);
    await callAI(text);
  };

  const togglePause = () => {
    if (!paused) {
      recognitionRef.current?.stop();
      window.speechSynthesis?.pause();
      setPaused(true);
      setAriaState("idle");
    } else {
      window.speechSynthesis?.resume();
      setPaused(false);
      if (ariaState === "idle") startListening();
    }
  };

  const stateColors = {
    idle:      { text: "text-text-tertiary",          bg: "bg-bg-surface" },
    speaking:  { text: "text-semantic-info-text",     bg: "bg-semantic-info-muted" },
    listening: { text: "text-semantic-error-text",    bg: "bg-semantic-error-muted" },
    thinking:  { text: "text-semantic-warning-text",  bg: "bg-semantic-warning-muted" },
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* ── LEFT: Aria panel ── */}
      <div className="flex flex-col w-[40%] min-w-[280px] border-r border-border-subtle bg-bg-page">
        {/* Avatar */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div className="relative" style={{ width: 180, height: 180 }}>
            <div className="w-full h-full rounded-2xl overflow-hidden border border-border-gold shadow-lg">
              <Image
                src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80"
                alt="Aria interviewer"
                fill
                className="object-cover"
              />
            </div>
            {/* Speaking ring */}
            <AnimatePresence>
              {ariaState === "speaking" && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: [0.4, 0.8, 0.4] }} exit={{ opacity: 0 }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="absolute pointer-events-none"
                  style={{ inset: -6, border: "2px solid var(--border-gold)", borderRadius: 20 }}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 text-center">
            <h3 className="font-display font-bold text-[20px] text-text-heading">Aria</h3>
            <p className="text-[11px] text-text-tertiary font-bold uppercase tracking-widest">Senior Technical Interviewer</p>
          </div>

          {/* State indicator */}
          <div className={`mt-3 px-4 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-2 ${stateColors[ariaState].bg} border border-border-subtle`}>
            {ariaState === "listening" && <span className="w-1.5 h-1.5 rounded-full bg-semantic-error-text animate-pulse" />}
            {ariaState === "speaking" && <SpeakingWave active />}
            <span className={stateColors[ariaState].text}>
              {ariaState === "idle" ? "Ready" : ariaState === "speaking" ? "Speaking" : ariaState === "listening" ? "Listening…" : "Thinking…"}
            </span>
          </div>

          {/* Current text */}
          <div className="mt-4 px-4 py-3 rounded-xl bg-bg-surface border border-border-subtle w-full max-h-[100px] overflow-y-auto custom-scrollbar">
            <p className="text-[12px] text-text-secondary leading-relaxed italic">{currentAriaText}</p>
          </div>
        </div>

        {/* Transcript */}
        {(isListening || transcript) && (
          <div className="mx-6 mb-3 px-4 py-2.5 rounded-xl bg-semantic-error-muted border border-semantic-error-border">
            <p className="text-[10px] font-bold text-semantic-error-text uppercase tracking-widest mb-1">You</p>
            <p className="text-[13px] text-text-primary font-medium">{transcript || "Listening…"}</p>
          </div>
        )}

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 custom-scrollbar space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "ai" ? "justify-start" : "justify-end"}`}>
              <div
                className="max-w-[88%] px-3 py-2 rounded-xl text-[12px] leading-relaxed font-medium"
                style={m.role === "ai"
                  ? { background: "#F0EAE0", border: "1px solid rgba(26,18,16,0.08)", color: "#1A1210", borderRadius: "4px 12px 12px 12px", fontFamily: "var(--font-body), system-ui, sans-serif", whiteSpace: "pre-wrap", wordBreak: "break-word" }
                  : { background: "#5C4100", color: "white", borderRadius: "12px 4px 12px 12px", fontFamily: "var(--font-body), system-ui, sans-serif" }
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Text input fallback */}
        <div className="px-5 pb-3 flex gap-2">
          <input
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleTextSend()}
            placeholder={srAvailable ? "Or type your answer…" : "Type your answer (mic not supported)"}
            disabled={ariaState === "thinking" || ariaState === "speaking"}
            className="flex-1 px-3 py-2 rounded-xl text-[12px] bg-bg-surface border border-border-subtle text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-gold disabled:opacity-40 transition-all"
          />
          <button
            onClick={handleTextSend}
            disabled={!textInput.trim() || ariaState === "thinking" || ariaState === "speaking"}
            className="px-3 py-2 rounded-xl bg-bg-surface border border-border-subtle text-text-tertiary hover:text-text-gold-deep hover:border-border-gold disabled:opacity-40 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Controls */}
        <div className="px-5 py-4 border-t border-border-subtle flex items-center justify-between gap-2 flex-wrap">
          {[
            { icon: muted ? VolumeX : Volume2, label: muted ? "Unmute" : "Mute", action: () => { const n = !muted; setMuted(n); if (n) window.speechSynthesis?.cancel(); }, active: muted, danger: false },
            { icon: isListening ? MicOff : Mic, label: isListening ? "Stop" : "Speak", action: () => isListening ? stopListening() : startListening(), active: isListening, danger: false },
            { icon: paused ? Play : Pause, label: paused ? "Resume" : "Pause", action: togglePause, active: paused, danger: false },
            { icon: X, label: "End", action: () => {
              if (!window.confirm("End the interview? Your progress will be lost.")) return;
              recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); onComplete(null);
            }, active: false, danger: true },
          ].map(({ icon: Icon, label, action, active, danger }) => (
            <button key={label} onClick={action} title={label}
              className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all duration-200"
              style={{
                background: active ? "var(--text-gold-deep)" : danger ? "transparent" : "var(--bg-surface)",
                border: active ? "1px solid var(--border-gold)" : danger ? "1px solid var(--color-error-border)" : "1px solid var(--border-subtle)",
              }}>
              <Icon className={`w-4 h-4 ${active ? "text-white" : danger ? "text-semantic-error" : "text-text-tertiary"}`} strokeWidth={1.5} />
              <span className={`text-[9px] font-bold ${active ? "text-white" : danger ? "text-semantic-error" : "text-text-tertiary"}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Webcam panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
        <div className="relative w-full max-w-xl aspect-video rounded-2xl overflow-hidden border border-white/10">
          {camError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-surface">
              <AlertCircle className="w-12 h-12 text-text-tertiary" strokeWidth={1} />
              <p className="text-text-secondary text-[14px] font-medium">Camera access denied</p>
              <p className="text-text-tertiary text-[12px]">Grant camera permission to enable face detection</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <FaceOverlay detected={faceDetected} />
              {/* Label */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                <p className="text-white text-[11px] font-bold tracking-widest uppercase">You</p>
              </div>
            </>
          )}
        </div>

        {/* Hidden canvas for face detection */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Tips */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center px-8">
          {[
            "Look directly at the camera",
            "Speak clearly and at a natural pace",
            "Use the mic button to answer questions",
          ].map(tip => (
            <span key={tip} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[11px] font-medium">
              {tip}
            </span>
          ))}
        </div>
      </div>

      {/* ── Code Editor (slides up) ── */}
      <AnimatePresence>
        {codeChallenge && (
          <CodePanel
            challenge={codeChallenge}
            onSubmit={handleCodeSubmit}
            onClose={() => {
              setCodeChallenge(null);
              // Resume listening if the editor was dismissed without submitting
              if (!pausedRef.current) startListening();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Complete Phase ───────────────────────────────────────────────────────────

function CompletePhase({ report, onRestart }: { report: Report | null; onRestart: () => void }) {
  const downloadReport = () => {
    if (!report) return;
    const lines = [
      "=== VIRTUARA AI — INTERVIEW REPORT ===",
      `Date: ${new Date().toLocaleString()}`,
      "",
      `Overall Score : ${report.overallScore} / 100`,
      `Verdict       : ${report.verdict}`,
      "",
      "STRENGTHS",
      "─────────",
      ...report.strengths.map(s => `  • ${s}`),
      "",
      "AREAS TO IMPROVE",
      "────────────────",
      ...report.improvements.map(s => `  • ${s}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `virtuara-interview-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full px-8 py-16 max-w-2xl mx-auto"
    >
      <div className="w-20 h-20 rounded-full bg-gold-500/10 border border-border-gold flex items-center justify-center mb-8">
        <CheckCircle className="w-10 h-10 text-text-gold-deep" strokeWidth={1.5} />
      </div>
      <h2 className="font-display text-[32px] font-bold text-text-heading mb-2">Interview Complete</h2>
      <p className="text-text-secondary text-[15px] mb-10">Here's Aria's assessment of your performance.</p>

      {report ? (
        <div className="w-full space-y-6">
          {/* Score */}
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 text-center">
            <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Overall Score</p>
            <p className="font-display text-[64px] font-bold text-text-gold-deep leading-none">{report.overallScore}</p>
            <p className="text-text-secondary text-[14px] font-medium mt-1">/100</p>
            <div className="mt-4 px-4 py-2 rounded-xl bg-gold-500/10 border border-border-gold inline-block">
              <p className="text-[13px] font-bold text-text-gold-deep">{report.verdict}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5">
              <p className="text-[10px] font-bold text-semantic-success-text uppercase tracking-widest mb-3">Strengths</p>
              <ul className="space-y-2">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-text-primary font-medium">
                    <span className="text-semantic-success-text mt-0.5 flex-shrink-0">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5">
              <p className="text-[10px] font-bold text-semantic-warning-text uppercase tracking-widest mb-3">Areas to Improve</p>
              <ul className="space-y-2">
                {report.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-text-primary font-medium">
                    <span className="text-semantic-warning-text mt-0.5 flex-shrink-0">→</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-text-secondary text-[15px]">Interview ended early — no report generated.</p>
      )}

      <div className="flex gap-4 mt-10 flex-wrap justify-center">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-8 py-3 rounded-2xl text-[14px] font-bold text-white transition-all shadow-lg"
          style={{ background: "var(--text-gold-deep)" }}
        >
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
        {report && (
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl text-[14px] font-bold text-text-secondary border border-border-subtle bg-bg-surface hover:border-border-gold hover:text-text-heading transition-all"
          >
            <Download className="w-4 h-4" /> Download Report
          </button>
        )}
        <a
          href="/dashboard"
          className="flex items-center gap-2 px-8 py-3 rounded-2xl text-[14px] font-bold text-text-secondary border border-border-subtle bg-bg-surface hover:border-border-gold hover:text-text-heading transition-all"
        >
          Back to Dashboard
        </a>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InterviewPage() {
  const { data: session } = useSession();
  const candidateName = (session as any)?.user?.name?.split(" ")?.[0] ?? "Candidate";

  const [phase, setPhase] = useState<Phase>("upload");
  const [resumeText, setResumeText] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  const handleStart = (text: string) => {
    setResumeText(text);
    setPhase("interview");
  };

  const handleComplete = (r: Report | null) => {
    setReport(r);
    setPhase("complete");
  };

  const handleRestart = () => {
    setReport(null);
    setPhase("upload");
  };

  return (
    <div className="h-full flex flex-col bg-bg-page overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle bg-bg-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <Briefcase className="w-4 h-4 text-text-gold-deep" />
          <span className="font-bold text-[14px] text-text-heading">AI Mock Interview</span>
          <span className="px-2 py-0.5 rounded-md bg-gold-500/10 border border-border-gold text-[9px] font-bold text-text-gold-deep uppercase tracking-widest">Beta</span>
        </div>
        <div className="flex items-center gap-2">
          {(["upload", "interview", "complete"] as Phase[]).map((p, i) => (
            <div key={p} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-all ${
                phase === p ? "bg-text-gold-deep scale-125" : i < (["upload","interview","complete"] as Phase[]).indexOf(phase) ? "bg-semantic-success-text" : "bg-border-subtle"
              }`} />
              {i < 2 && <div className="w-8 h-px bg-border-subtle" />}
            </div>
          ))}
        </div>
        <a href="/dashboard" className="text-[12px] font-bold text-text-tertiary hover:text-text-gold-deep flex items-center gap-1.5 transition-colors">
          <X className="w-3.5 h-3.5" /> Exit
        </a>
      </div>

      {/* Phase content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {phase === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto custom-scrollbar">
              <UploadPhase onStart={handleStart} />
            </motion.div>
          )}
          {phase === "interview" && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <InterviewPhase resumeText={resumeText} onComplete={handleComplete} candidateName={candidateName} />
            </motion.div>
          )}
          {phase === "complete" && (
            <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto custom-scrollbar">
              <CompletePhase report={report} onRestart={handleRestart} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
