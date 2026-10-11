"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  Calculator,
  Atom,
  FlaskConical,
  Binary,
  ScrollText,
  Library,
  TrendingUp,
  Brain,
  BarChart3,
  Dna,
  Compass,
  Loader2,
} from "lucide-react";
import { getSubjects, type DjangoSubject } from "@/lib/api";
import { useAria } from "@/components/aria/AriaProvider";

// Map Django category slugs → display labels
const CATEGORY_LABELS: Record<string, string> = {
  mathematics: "Exact Sciences",
  science: "Exact Sciences",
  humanities: "Humanities",
  technology: "Computer Science",
  business: "Humanities",
};

// Map subject slug → Lucide icon
const ICON_MAP: Record<string, React.ElementType> = {
  mathematics: Calculator,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Dna,
  "computer-science": Binary,
  history: ScrollText,
  literature: Library,
  economics: TrendingUp,
  geography: Compass,
  philosophy: Compass,
  psychology: Brain,
  statistics: BarChart3,
};

type Category = "All" | "Exact Sciences" | "Humanities" | "Computer Science";
const CATEGORIES: Category[] = ["All", "Exact Sciences", "Humanities", "Computer Science"];

export default function SubjectsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { setActiveSubject } = useAria();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [subjects, setSubjects] = useState<DjangoSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = session?.accessToken;
    getSubjects(token)
      .then(setSubjects)
      .catch(() => setError("Could not load subjects. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [session]);

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const displayCategory = CATEGORY_LABELS[s.category] ?? "Other";
    const matchesCategory = activeCategory === "All" || displayCategory === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (selected: DjangoSubject) => {
    setActiveSubject({ id: selected.id, slug: selected.slug, name: selected.name });
    localStorage.setItem("virtuara_active_subject", selected.slug);
    router.push(`/dashboard?subject=${encodeURIComponent(selected.slug)}`);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-bg-page flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-text-gold-deep animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-bg-page flex flex-col items-center justify-center gap-4">
        <p className="text-semantic-error-text font-bold">{error}</p>
        <button
          onClick={() => { const token = session?.accessToken; setError(""); setLoading(true); getSubjects(token).then(setSubjects).catch(() => setError("Still unreachable.")).finally(() => setLoading(false)); }}
          className="px-6 py-2 rounded-xl bg-bg-surface border border-border-subtle text-text-gold-deep font-bold text-sm hover:border-gold-500/30 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-bg-page px-6 py-12 md:px-12 font-body custom-scrollbar selection:bg-clematis-100">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col items-center gap-10 mb-20">
          <div className="w-full max-w-[520px] relative group text-center">
            <h1 className="font-display font-bold text-[42px] text-text-heading tracking-tight mb-8">Discover Knowledge</h1>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-text-gold-deep transition-colors" />
              <input
                type="text"
                placeholder="What would you like to master today?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-16 pl-14 pr-8 bg-bg-surface border border-border-subtle rounded-[24px] text-[17px] font-bold outline-none focus:border-gold-500/50 focus:shadow-sm transition-all shadow-sm placeholder:text-text-tertiary"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300 border ${
                  activeCategory === cat
                    ? "bg-text-gold-deep text-white border-transparent shadow-sm"
                    : "bg-bg-surface border-border-subtle text-text-secondary hover:border-gold-500/30 hover:bg-bg-overlay"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* SUBJECT GRID */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredSubjects.map((s, index) => {
              const Icon = ICON_MAP[s.slug] ?? BookOpen;
              const displayCategory = CATEGORY_LABELS[s.category] ?? s.category;

              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  onClick={() => handleSelect(s)}
                  className="group bg-bg-surface border border-border-subtle rounded-[32px] p-8 cursor-pointer hover:border-border-gold hover:-translate-y-2 hover:shadow-md transition-all duration-500 relative flex flex-col"
                >
                  {/* Top Row */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 rounded-[22px] bg-bg-overlay border border-border-subtle flex items-center justify-center text-text-gold-deep group-hover:bg-text-gold-deep group-hover:text-white group-hover:scale-110 transition-all duration-500 shadow-sm">
                      <Icon className="w-7 h-7" strokeWidth={1.5} />
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-gold-500/10 border border-border-gold text-[10px] font-black text-text-gold-deep uppercase tracking-widest">
                      {displayCategory}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="font-display text-[24px] font-bold text-text-heading mb-2 group-hover:text-text-gold-deep transition-colors leading-tight">
                      {s.icon} {s.name}
                    </h3>
                    <div className="flex items-center gap-2.5 text-text-tertiary mb-8">
                      <BookOpen className="w-4 h-4 opacity-60" />
                      <span className="text-[13px] font-bold tracking-tight">{s.module_count} Curated Modules</span>
                    </div>
                  </div>

                  {/* Bottom */}
                  <div className="mt-auto pt-8 border-t border-border-subtle">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1 opacity-60">Status</span>
                        <span className="px-2.5 py-0.5 rounded-md bg-color-info-muted text-color-info-text text-[10px] font-black tracking-tighter uppercase border border-color-info-border">NEW</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl border border-border-subtle flex items-center justify-center group-hover:border-border-gold group-hover:bg-bg-overlay transition-all shadow-sm">
                        <span className="text-text-gold-deep group-hover:text-text-gold text-[18px] group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* EMPTY STATE */}
        {filteredSubjects.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 rounded-full bg-bg-surface flex items-center justify-center text-text-tertiary mb-8 border border-border-subtle shadow-sm">
              <Search className="w-10 h-10" />
            </div>
            <h3 className="font-display text-[26px] font-bold text-text-heading mb-3">No subjects found</h3>
            <p className="text-text-secondary text-[16px] font-medium max-w-sm opacity-70">
              We couldn&apos;t find anything matching &quot;{search}&quot;. Try a different search or category.
            </p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("All"); }}
              className="mt-10 px-8 py-3 bg-bg-surface text-text-gold-deep font-bold text-[14px] rounded-xl hover:bg-bg-overlay transition-all border border-border-gold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
