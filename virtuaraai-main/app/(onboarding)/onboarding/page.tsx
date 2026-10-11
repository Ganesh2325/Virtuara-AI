"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Book, BookOpen, Trophy, Check, ArrowRight, ArrowLeft, Brain, Heart, GraduationCap } from "lucide-react";
import GlowButton from "@/components/shared/GlowButton";
import AvatarOrb from "@/components/shared/AvatarOrb";
import { getSubjects, api, type DjangoSubject } from "@/lib/api";

type Step = 1 | 2 | 3 | 4 | 5;

const subjects = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "History", "Literature", "Computer Science", "Economics"
];

const levels = [
  { id: "beginner", label: "Beginner", icon: Book, desc: "New to this subject, starting from the basics." },
  { id: "intermediate", label: "Intermediate", icon: BookOpen, desc: "Familiar with the concepts, looking to deepen knowledge." },
  { id: "advanced", label: "Advanced", icon: Trophy, desc: "Experienced, seeking mastery and complex challenges." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [djangoSubjects, setDjangoSubjects] = useState<DjangoSubject[]>([]);

  // Form State
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [goal, setGoal] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

  // Redirect already-onboarded users straight to dashboard
  useEffect(() => {
    const email = (session as any)?.user?.email;
    if (email && localStorage.getItem(`onboarding_${email}`) === "true") {
      router.replace("/dashboard");
    }
  }, [session, router]);

  // Fetch subject UUIDs from Django on mount
  useEffect(() => {
    getSubjects().then(setDjangoSubjects).catch(() => {});
  }, []);

  const nextStep = () => {
    if (step < 5) {
      setDirection(1);
      setStep((s) => (s + 1) as Step);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => (s - 1) as Step);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const accessToken = (session as any)?.accessToken as string | undefined;

      // Map selected subject names → UUIDs from Django
      const subjectIds = djangoSubjects
        .filter((s) => selectedSubjects.includes(s.name))
        .map((s) => s.id);

      if (accessToken) {
        await api.post(
          "/api/v1/auth/onboarding/",
          {
            full_name: name.trim(),
            age_group: ageGroup,
            learning_goal: goal,
            level: selectedLevel,
            subject_ids: subjectIds,
            custom_subjects: customSubject.trim().length >= 2 && !customSubjects.some((item) => item.toLowerCase() === customSubject.trim().toLowerCase())
              ? [...customSubjects, customSubject.trim()]
              : customSubjects,
          },
          accessToken
        );
      }
    } catch {
      // Non-blocking — still proceed to dashboard
    } finally {
      const email = (session as any)?.user?.email ?? "user";
      localStorage.setItem(`onboarding_${email}`, "true");
      router.push("/dashboard");
    }
  };

  const addCustomSubject = () => {
    const typed = customSubject.trim();
    if (typed.length < 2) return;
    const exists = [...subjects, ...customSubjects].some((item) => item.toLowerCase() === typed.toLowerCase());
    if (!exists) setCustomSubjects((current) => [...current, typed]);
    setCustomSubject("");
  };

  const toggleSubject = (s: string) => {
    setSelectedSubjects(prev => 
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  return (
    <div className="min-h-screen bg-bg-page font-body selection:bg-clematis-100 relative overflow-hidden flex flex-col items-center">
      {/* ── BACKGROUND WASH ──────────────────────────────── */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-clematis-200/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-mist-200/20 blur-[120px]" />
      </div>

      {/* ── PROGRESS BAR ─────────────────────────────────── */}
      <div className="fixed top-0 left-0 w-full h-1 bg-bg-elevated z-50">
        <motion.div 
          className="h-full bg-gradient-cta"
          initial={{ width: 0 }}
          animate={{ width: `${(step / 5) * 100}%` }}
          transition={{ duration: 0.6, ease: "circOut" }}
        />
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-6 relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full flex flex-col items-center"
          >
            {/* STEP 1: WELCOME */}
            {step === 1 && (
              <div className="text-center max-w-[520px]">
                <div className="mb-8 flex justify-center">
                  <AvatarOrb size="lg" />
                </div>
                <h1 className="font-display font-bold text-[48px] text-text-primary leading-[1.1] mb-4">
                  Welcome to Virtuara AI
                </h1>
                <p className="text-text-secondary text-[18px] font-light mb-10">
                  Let's personalize your learning experience and introduce you to your new AI mentor.
                </p>
                <GlowButton onClick={nextStep} variant="primary" className="h-[58px] px-10 text-[17px] rounded-full">
                  Let's Begin →
                </GlowButton>
              </div>
            )}

            {/* STEP 2: ABOUT YOU */}
            {step === 2 && (
              <div className="w-full max-w-[520px]">
                <h2 className="font-display font-bold text-[36px] text-text-primary text-center mb-10">
                  Tell us about yourself
                </h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-text-tertiary uppercase tracking-wider ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Gabriella Smith"
                      className="w-full h-[54px] px-5 bg-bg-elevated border border-border-default rounded-xl focus:border-border-mauve focus:ring-4 focus:ring-clematis-500/10 outline-none transition-all placeholder:text-text-placeholder"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-text-tertiary uppercase tracking-wider ml-1">Age Group</label>
                    <select 
                      value={ageGroup}
                      onChange={(e) => setAgeGroup(e.target.value)}
                      className="w-full h-[54px] px-5 bg-bg-elevated border border-border-default rounded-xl focus:border-border-mauve outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select age group</option>
                      <option value="under-18">Under 18</option>
                      <option value="18-24">18–24</option>
                      <option value="25-34">25–34</option>
                      <option value="35-44">35–44</option>
                      <option value="45+">45+</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-text-tertiary uppercase tracking-wider ml-1">About you</label>
                    <textarea 
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="A short description about you and what you want to learn"
                      className="w-full h-[120px] p-5 bg-bg-elevated border border-border-default rounded-xl focus:border-border-mauve outline-none transition-all resize-none placeholder:text-text-placeholder"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-12">
                  <button onClick={prevStep} className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors font-medium">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <GlowButton 
                    onClick={nextStep} 
                    disabled={!name || !ageGroup || !goal}
                    variant="primary" 
                    className="px-8"
                  >
                    Continue <ArrowRight size={18} className="ml-2" />
                  </GlowButton>
                </div>
              </div>
            )}

            {/* STEP 3: SUBJECTS */}
            {step === 3 && (
              <div className="w-full max-w-3xl">
                <h2 className="font-display font-bold text-[36px] text-text-primary text-center mb-4">
                  What do you want to learn?
                </h2>
                <p className="text-center text-text-secondary mb-12">Select one or more subjects to get started.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {subjects.map((s) => {
                    const isSelected = selectedSubjects.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSubject(s)}
                        className={`relative group h-[58px] px-4 rounded-xl flex items-center justify-center text-[14px] font-bold transition-all duration-300 border ${
                          isSelected 
                            ? "bg-gradient-soft border-border-mauve text-text-heading shadow-md scale-[1.02]" 
                            : "bg-bg-elevated border-border-subtle text-text-secondary hover:border-border-active hover:scale-[1.02]"
                        }`}
                      >
                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2">
                            <Check size={14} className="text-clematis-600" />
                          </motion.div>
                        )}
                        {s}
                      </button>
                    );
                  })}
                </div>
                {customSubjects.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {customSubjects.map((subjectName) => (
                      <button
                        key={subjectName}
                        type="button"
                        onClick={() => setCustomSubjects((current) => current.filter((item) => item !== subjectName))}
                        className="h-[58px] px-4 rounded-xl border border-border-mauve bg-gradient-soft text-[14px] font-bold"
                      >
                        {subjectName} ×
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex gap-3">
                  <input
                    value={customSubject}
                    onChange={(event) => setCustomSubject(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomSubject();
                      }
                    }}
                    placeholder="Type a subject such as Python, then press Enter"
                    className="flex-1 h-14 px-5 bg-bg-elevated border border-border-default rounded-xl outline-none"
                  />
                  <button type="button" onClick={addCustomSubject} className="h-14 px-5 rounded-xl bg-text-gold-deep text-white font-bold">Add</button>
                </div>

                <div className="flex items-center justify-between mt-16">
                  <button onClick={prevStep} className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors font-medium">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <GlowButton 
                    onClick={nextStep} 
                    disabled={selectedSubjects.length === 0 && customSubjects.length === 0}
                    variant="primary" 
                    className="px-8"
                  >
                    Continue <ArrowRight size={18} className="ml-2" />
                  </GlowButton>
                </div>
              </div>
            )}

            {/* STEP 4: LEVEL */}
            {step === 4 && (
              <div className="w-full max-w-4xl">
                <h2 className="font-display font-bold text-[36px] text-text-primary text-center mb-12">
                  What's your current level?
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {levels.map((lvl) => {
                    const isSelected = selectedLevel === lvl.id;
                    const Icon = lvl.icon;
                    return (
                      <button
                        key={lvl.id}
                        onClick={() => setSelectedLevel(lvl.id)}
                        className={`p-8 rounded-[24px] border-2 text-center transition-all duration-300 flex flex-col items-center gap-4 ${
                          isSelected
                            ? "border-border-mauve bg-bg-overlay shadow-[0_0_0_4px_rgba(154,94,151,0.12)] -translate-y-2"
                            : "border-border-subtle bg-bg-elevated hover:border-border-active"
                        }`}
                      >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-colors ${isSelected ? "bg-clematis-100 text-clematis-600" : "bg-bg-page text-text-tertiary"}`}>
                          <Icon size={32} />
                        </div>
                        <h3 className="font-display text-[22px] font-bold text-text-primary">{lvl.label}</h3>
                        <p className="text-[13px] text-text-secondary leading-relaxed font-body">{lvl.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-16">
                  <button onClick={prevStep} className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors font-medium">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <GlowButton 
                    onClick={nextStep} 
                    disabled={!selectedLevel}
                    variant="primary" 
                    className="px-8"
                  >
                    Continue <ArrowRight size={18} className="ml-2" />
                  </GlowButton>
                </div>
              </div>
            )}

            {/* STEP 5: MEET ARIA */}
            {step === 5 && (
              <div className="text-center w-full max-w-[600px]">
                <h2 className="font-display font-bold text-[40px] text-text-primary mb-10">
                  Meet Aria, Your AI Mentor
                </h2>
                
                <div className="mb-12 flex justify-center">
                  <AvatarOrb size="xl" speaking={true} />
                </div>
                
                <div className="grid grid-cols-3 gap-8 mb-10">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-clematis-50 flex items-center justify-center text-clematis-600">
                      <Brain size={20} />
                    </div>
                    <span className="text-[14px] font-bold text-text-primary">Adaptive</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-mist-50 flex items-center justify-center text-mist-600">
                      <Heart size={20} />
                    </div>
                    <span className="text-[14px] font-bold text-text-primary">Emotionally Aware</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <GraduationCap size={20} />
                    </div>
                    <span className="text-[14px] font-bold text-text-primary">Always Teaching</span>
                  </div>
                </div>

                <p className="text-text-secondary text-[16px] mb-12">
                  Aria will adapt to everything you just told us. Ready to start your session?
                </p>

                <div className="flex items-center justify-between">
                  <button onClick={prevStep} className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors font-medium">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <GlowButton 
                    onClick={handleComplete} 
                    loading={loading}
                    variant="primary" 
                    className="h-[58px] px-12 text-[17px] rounded-full"
                  >
                    Start Learning →
                  </GlowButton>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
