"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Bell,
  GraduationCap,
  Lock,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Camera,
} from "lucide-react";
import GlowButton from "@/components/shared/GlowButton";
import { archiveCustomSubject, createCustomSubject, getProfile, getSubjects, type DjangoSubject } from "@/lib/api";

// -- TABS --
type SettingsTab = "profile" | "notifications" | "learning" | "account";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "learning", label: "Learning", icon: GraduationCap },
    { id: "account", label: "Account", icon: Lock },
  ];

  return (
    <div className="flex h-full bg-bg-page overflow-hidden font-body relative antialiased">
      {/* --- SIDEBAR --- */}
      <aside className="w-[240px] bg-bg-surface border-r border-border-subtle flex flex-col p-8 flex-shrink-0 z-10 shadow-sm">
        <div className="flex-1 flex flex-col gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-[14px] font-bold transition-all duration-500 group tracking-tight ${
                  isActive 
                    ? "bg-gold-500/10 border border-border-gold text-text-gold-deep shadow-sm" 
                    : "text-text-tertiary hover:text-text-heading hover:bg-bg-overlay/50"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 transition-all duration-500 ${isActive ? "text-text-gold-deep" : "text-text-tertiary group-hover:text-text-gold-deep"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-4 px-4 py-3 rounded-xl text-[14px] font-bold text-text-tertiary hover:text-white hover:bg-semantic-error transition-all duration-300 group antialiased"
        >
          <LogOut className="w-4.5 h-4.5 text-text-tertiary group-hover:text-white" />
          Sign Out
        </button>
      </aside>

      {/* --- CONTENT AREA --- */}
      <main className="flex-1 overflow-y-auto p-12 md:p-16 custom-scrollbar relative z-0">
        <AnimatePresence mode="wait">
          {activeTab === "profile" && <ProfileTab key="profile" session={session} />}
          {activeTab === "notifications" && <NotificationsTab key="notifications" />}
          {activeTab === "learning" && <LearningTab key="learning" onReset={() => setShowResetModal(true)} />}
          {activeTab === "account" && <AccountTab key="account" onDelete={() => setShowDeleteModal(true)} />}
        </AnimatePresence>
      </main>

      {/* --- MODALS --- */}
      <Modal 
        isOpen={showResetModal} 
        onClose={() => setShowResetModal(false)}
        title="Reset Progress?"
        description="This will permanently clear your session history and subject mastery. This action is irreversible within the vault."
        confirmLabel="Reset Everything"
        variant="danger"
        onConfirm={() => {
          // Reset logic here
          setShowResetModal(false);
        }}
      />

      <DeleteAccountModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// -- TAB COMPONENTS --

function ProfileTab({ session }: { session: any }) {
  const [profileName, setProfileName] = useState(session?.user?.name || "");
  const [ageGroup, setAgeGroup] = useState("");
  const [about, setAbout] = useState("");
  const [level, setLevel] = useState("");
  const name = profileName || session?.user?.name || "Explorer";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!session?.accessToken) return;
    getProfile(session.accessToken).then((profile) => {
      setProfileName(profile.full_name || "");
      setAgeGroup(profile.age_group || "");
      setAbout(profile.learning_goal || "");
      setLevel(profile.level || "");
    }).catch(() => {});
  }, [session?.accessToken]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl"
    >
      <h2 className="font-display font-semibold text-[42px] text-text-heading mb-10 tracking-tight antialiased">Your Identity</h2>
      
      <div className="flex items-center gap-8 mb-12">
        <div className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center text-text-heading font-display font-bold text-2xl shadow-[0_8px_24px_rgba(212,175,55,0.3)] relative group overflow-hidden">
          {session?.user?.image ? (
            <img src={session.user.image} alt={name} className="w-full h-full object-cover" />
          ) : initials}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <GlowButton variant="ghost" className="py-2 h-auto text-[13px] font-bold px-6 border-border-subtle">Update Portrait</GlowButton>
          <p className="text-[11px] text-text-tertiary font-bold uppercase tracking-[0.1em] ml-1">Asset requirements: JPG/PNG, 2MB</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Input label="Full Name" value={profileName} readOnly />
        <div className="relative">
          <Input label="Secure Email" defaultValue={session?.user?.email} readOnly />
          <div className="absolute top-[38px] right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-semantic-success/10 border border-semantic-success/20 text-[10px] text-semantic-success font-bold tracking-wider">
            <ShieldCheck className="w-3 h-3" /> VERIFIED
          </div>
        </div>
        <Input label="Unique Handler" defaultValue={name.toLowerCase().replace(/\s+/g, "-")} />
        <div className="flex flex-col gap-2.5">
          <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-1.5">Origin</label>
          <div className="relative group">
            <select className="w-full h-[52px] px-5 bg-bg-surface border border-border-subtle rounded-xl focus:border-gold-500/50 outline-none transition-all appearance-none cursor-pointer text-[15px] text-text-primary font-bold shadow-sm">
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Germany</option>
              <option>India</option>
              <option>Canada</option>
              <option>Australia</option>
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary rotate-90 pointer-events-none group-hover:text-text-gold-deep transition-colors" />
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-1.5">Age group</label>
            <input value={ageGroup} readOnly className="w-full h-[52px] px-5 bg-bg-surface border border-border-subtle rounded-xl text-[15px] font-bold" />
            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-1.5 mt-4">Study level</label>
            <input value={level} readOnly className="w-full h-[52px] px-5 bg-bg-surface border border-border-subtle rounded-xl text-[15px] font-bold capitalize" />
            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-1.5 mt-4">About you</label>
            <textarea
              value={about}
              readOnly
              placeholder="Your onboarding description appears here."
              className="w-full h-[120px] p-5 bg-bg-surface border border-border-subtle rounded-xl outline-none resize-none text-[15px] text-text-primary font-bold shadow-sm placeholder:text-text-tertiary"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-8 border-t border-border-subtle">
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-[13px] font-bold text-semantic-success-text"
          >
            <CheckCircle2 className="w-4 h-4" /> Changes saved
          </motion.span>
        )}
        <GlowButton variant="primary" className="px-12 h-14 text-[15px]" onClick={handleSave}>
          Commit Changes
        </GlowButton>
      </div>
    </motion.div>
  );
}

function NotificationsTab() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl"
    >
      <h2 className="font-display font-semibold text-[42px] text-text-heading mb-3 tracking-tight antialiased">Bulletins</h2>
      <p className="text-text-secondary text-[16px] font-bold mb-12 antialiased">Orchestrate the flow of intelligence between Aria and your devices.</p>

      <div className="flex flex-col border-t border-border-subtle">
        <ToggleRow 
          label="Session Reminders" 
          description="Aria's daily summons at your designated learning window."
          defaultChecked={true}
        />
        <ToggleRow 
          label="Honors & Rank Alerts" 
          description="Immediate verification when you achieve a milestone or surge."
          defaultChecked={true}
        />
        <ToggleRow 
          label="Weekly Intellectual Audit" 
          description="A comprehensive summary of your cognitive advances via email."
          defaultChecked={false}
        />
        <ToggleRow 
          label="New Disciplines Available" 
          description="Priority notification when new academic modules are integrated."
          defaultChecked={true}
        />
        <ToggleRow 
          label="Persistence Watch" 
          description="Strategic alerts when your streak faces potential deactivation."
          defaultChecked={true}
        />
      </div>
    </motion.div>
  );
}

function LearningTab({ onReset }: { onReset: () => void }) {
  const { data: session } = useSession();
  const [pace, setPace] = useState(50);
  const [subjects, setSubjects] = useState<DjangoSubject[]>([]);
  const [customName, setCustomName] = useState("");
  const [subjectError, setSubjectError] = useState("");
  useEffect(() => {
    getSubjects(session?.accessToken).then(setSubjects).catch(() => setSubjectError("Subjects could not be loaded."));
  }, [session?.accessToken]);
  const addSubject = async () => {
    if (customName.trim().length < 2 || !session?.accessToken) return;
    try {
      const created = await createCustomSubject({ name: customName.trim() }, session.accessToken);
      setSubjects((current) => [...current, created]);
      setCustomName("");
      setSubjectError("");
    } catch {
      setSubjectError("The custom subject could not be created.");
    }
  };
  const durations = ["15 min", "30 min", "45 min", "60 min"];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl"
    >
      <h2 className="font-display font-semibold text-[42px] text-text-heading mb-10 tracking-tight antialiased">Acquisition Logic</h2>

      <div className="space-y-16">
        <section>
          <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] mb-6 block ml-1.5">Assigned Disciplines</label>
          <div className="flex flex-wrap gap-3">
            {subjects.map(s => (
              <div key={s.id} className="px-5 py-3 rounded-xl border border-border-subtle bg-bg-surface text-[14px] font-bold text-text-heading">
                {s.icon} {s.name}
                {s.is_custom && (
                  <span
                    className="ml-2 text-semantic-error"
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (!session?.accessToken) return;
                      await archiveCustomSubject(s.id, session.accessToken);
                      setSubjects((current) => current.filter((item) => item.id !== s.id));
                    }}
                  >
                    Archive
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Create a custom subject" className="flex-1 h-12 px-4 rounded-xl border border-border-subtle bg-bg-surface" />
            <button onClick={addSubject} className="px-5 rounded-xl bg-text-gold-deep text-white font-bold">Add</button>
          </div>
          {subjectError && <p className="mt-3 text-[13px] text-semantic-error">{subjectError}</p>}
        </section>

        <section>
          <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] mb-6 block ml-1.5">Quantum Duration</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {durations.map(d => (
              <button key={d} className={`h-14 rounded-2xl border transition-all duration-500 text-[15px] font-bold antialiased ${d === "30 min" ? "border-border-gold bg-gold-500/10 text-text-gold-deep shadow-sm" : "border-border-subtle bg-bg-surface text-text-tertiary hover:border-gold-500/30"}`}>
                {d}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-6">
            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-1.5">Neurospheric Velocity</label>
            <span className="text-[14px] font-bold text-text-gold-deep tracking-tighter">{pace < 40 ? "Steady State" : pace > 70 ? "Hyper-Speed" : "Balanced Flow"}</span>
          </div>
          <div className="relative h-8 flex items-center group">
            <div className="absolute w-full h-1.5 bg-bg-overlay rounded-full overflow-hidden shadow-sm">
              <div className="h-full bg-text-gold-deep shadow-[0_0_15px_rgba(138,98,0,0.3)] transition-all duration-300" style={{ width: `${pace}%` }}></div>
            </div>
            <input 
              type="range" value={pace} onChange={(e) => setPace(Number(e.target.value))}
              className="absolute w-full appearance-none bg-transparent cursor-pointer z-10 
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text-gold-deep 
              [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(138,98,0,0.4)] [&::-webkit-slider-thumb]:transition-all
              [&::-webkit-slider-thumb]:active:scale-95 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg-page"
            />
          </div>
          <div className="flex justify-between mt-4 text-[11px] text-text-tertiary font-bold uppercase tracking-[0.15em]">
            <span>Methodical</span>
            <span>Intensive</span>
          </div>
        </section>

        <section className="pt-12 border-t border-border-subtle">
          <h3 className="text-semantic-error font-bold text-[15px] mb-3 flex items-center gap-2.5 antialiased">
            <AlertTriangle className="w-4.5 h-4.5" /> Purge Cognitive History
          </h3>
          <p className="text-text-secondary text-[14px] font-bold mb-8 leading-relaxed max-w-xl">Permanently erase all session logs, mastery data, and trajectory records from the vault.</p>
          <button 
            onClick={onReset}
            className="px-8 py-3.5 rounded-xl border-2 border-semantic-error/30 text-semantic-error text-[14px] font-bold hover:bg-semantic-error/5 hover:border-semantic-error/50 transition-all antialiased shadow-sm"
          >
            Reset All Data
          </button>
        </section>
      </div>
    </motion.div>
  );
}

function AccountTab({ onDelete }: { onDelete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl"
    >
      <h2 className="font-display font-semibold text-[42px] text-text-heading mb-10 tracking-tight antialiased">Vault Access</h2>

      <section className="mb-14">
        <h3 className="text-[16px] font-bold text-text-heading mb-8 tracking-tight">Access Credentials</h3>
        <div className="space-y-6 max-w-sm">
          <Input label="Current Password" type="password" />
          <Input label="New Password" type="password" />
          <Input label="Verify New Password" type="password" />
          <GlowButton variant="ghost" className="mt-4 px-8 py-3 h-auto text-[14px] font-bold border-border-subtle">Update Credentials</GlowButton>
        </div>
      </section>

      <section className="mb-14 pt-12 border-t border-border-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-text-heading tracking-tight mb-1">Advanced 2FA Protection</h3>
            <p className="text-[14px] text-text-secondary font-bold">Reinforce your vault with multi-layered biometric or device verification.</p>
          </div>
          <Toggle checked={false} onChange={() => {}} />
        </div>
      </section>

      <section className="pt-12 border-t border-border-subtle">
        <div className="p-8 rounded-3xl bg-semantic-error/5 border border-semantic-error/20 shadow-sm">
          <h3 className="text-semantic-error font-bold text-[16px] mb-3 antialiased">Terminal Deactivation</h3>
          <p className="text-[14px] text-semantic-error text-opacity-80 font-bold mb-8 leading-relaxed">Irreversibly delete your account and all associated cognitive records from our secure architecture.</p>
          <button 
            onClick={onDelete}
            className="px-8 py-3.5 rounded-xl bg-semantic-error text-white text-[14px] font-bold hover:brightness-110 shadow-2xl shadow-red-900/40 transition-all flex items-center gap-3 antialiased"
          >
            <Trash2 className="w-4.5 h-4.5" strokeWidth={2.5} /> Purge Account
          </button>
        </div>
      </section>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// -- UI HELPERS --

function Input({ label, ...props }: any) {
  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-1.5">{label}</label>
      <input 
        className="w-full h-[52px] px-5 bg-bg-surface border border-border-subtle rounded-xl focus:border-gold-500/50 outline-none transition-all text-[15px] text-text-primary font-bold placeholder:text-text-tertiary shadow-sm disabled:bg-bg-overlay/50"
        {...props}
      />
    </div>
  );
}

function ToggleRow({ label, description, defaultChecked }: any) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-7 border-b border-border-subtle last:border-none">
      <div>
        <h4 className="text-[16px] font-bold text-text-heading tracking-tight mb-0.5">{label}</h4>
        <p className="text-[14px] text-text-secondary font-bold">{description}</p>
      </div>
      <Toggle checked={checked} onChange={setChecked} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-[48px] h-[26px] rounded-full p-1 transition-all duration-500 relative shadow-inner ${checked ? "bg-text-gold-deep" : "bg-bg-overlay"}`}
    >
      <motion.div 
        animate={{ x: checked ? 22 : 0 }}
        className={`w-[18px] h-[18px] rounded-full shadow-md ${checked ? "bg-white" : "bg-text-tertiary"}`}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function Modal({ isOpen, onClose, title, description, confirmLabel, onConfirm, variant = "primary" }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-bg-page border border-border-subtle rounded-[32px] p-10 max-w-md w-full shadow-2xl">
        <h3 className="font-display font-semibold text-[32px] text-text-heading mb-4 tracking-tight leading-tight antialiased">{title}</h3>
        <p className="text-text-secondary text-[16px] font-bold mb-10 leading-relaxed antialiased">{description}</p>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 h-13 px-6 rounded-xl bg-bg-surface border border-border-subtle text-text-heading font-bold hover:bg-bg-overlay transition-all antialiased">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 h-13 px-6 rounded-xl font-bold text-white transition-all shadow-lg ${variant === "danger" ? "bg-semantic-error shadow-sm" : "bg-text-gold-deep shadow-sm"}`}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteAccountModal({ isOpen, onClose }: any) {
  const [confirmText, setConfirmText] = useState("");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-bg-page border border-semantic-error/30 rounded-[32px] p-10 max-w-md w-full shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-semantic-error/10 border border-semantic-error/20 flex items-center justify-center text-semantic-error mb-8 shadow-sm">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="font-display font-semibold text-[32px] text-text-heading mb-4 tracking-tight leading-tight">Critical Confirmation</h3>
        <p className="text-text-secondary text-[15px] font-bold mb-8 leading-relaxed">This action is irreversible. All progress, metrics, and cognitive data will be permanently purged from the architecture.</p>
        
        <div className="bg-bg-overlay/50 p-6 rounded-2xl mb-10 border border-border-subtle shadow-sm">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em] mb-3">To verify deactivation, type "PURGE"</p>
          <input 
            type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
            placeholder="TYPE PURGE"
            className="w-full h-12 px-4 bg-bg-surface border border-border-subtle rounded-xl focus:border-semantic-error outline-none transition-all text-sm font-bold tracking-[0.4em] text-semantic-error placeholder:text-text-tertiary text-center"
          />
        </div>

        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 h-13 px-6 rounded-xl text-text-tertiary font-bold hover:text-text-heading transition-all antialiased">Cancel</button>
          <button 
            disabled={confirmText !== "PURGE"}
            className="flex-1 h-13 px-6 rounded-xl bg-semantic-error text-white font-bold hover:brightness-110 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Deactivate Vault
          </button>
        </div>
      </motion.div>
    </div>
  );
}
