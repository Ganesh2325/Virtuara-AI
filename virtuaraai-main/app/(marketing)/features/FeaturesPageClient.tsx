"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, X, AlertTriangle } from "lucide-react";

const deepDiveSections = [
  {
    badge: "Platform Feature 01",
    title: "Adaptive Learning",
    subtitle: "Smart AI that evolves with you",
    bullets: [
      "Real-time skill gap detection based on your answers",
      "Dynamic difficulty curve — never too hard, never too easy",
      "Personalized curriculum that evolves with you",
    ],
    image: "https://images.unsplash.com/photo-1509869175650-a1d97972541a?w=600&q=80",
    imageLeft: false,
    color: "#00D4FF",
  },
  {
    badge: "Platform Feature 02",
    title: "Humanoid AI Mentor",
    subtitle: "Lifelike teaching, beyond any chatbot",
    bullets: [
      "MetaHuman-powered 3D avatar with realistic expressions",
      "Lip-synced voice responses with emotional tone",
      "Responds to your questions like a real teacher",
    ],
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80",
    imageLeft: true,
    color: "#7B2FFF",
  },
  {
    badge: "Platform Feature 03",
    title: "Emotional Intelligence",
    subtitle: "A mentor that truly understands you",
    bullets: [
      "Detects confusion and frustration from text + voice",
      "Switches teaching strategy when you're stuck",
      "Celebrates milestones and keeps you motivated",
    ],
    image: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=600&q=80",
    imageLeft: false,
    color: "#00FFB2",
  },
  {
    badge: "Platform Feature 04",
    title: "Structured Mastery Path",
    subtitle: "Learn deeply, not just quickly",
    bullets: [
      "Concept → Example → Practice → Verify structure",
      "Scaffolded explanations that build on each other",
      "Never skips steps — ensures real understanding",
    ],
    image: "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=600&q=80",
    imageLeft: true,
    color: "#FFB300",
  },
];

const tableRows = [
  {
    feature: "Personalization",
    traditional: { text: "None", icon: "none" as const },
    virtuara: { text: "Fully Adaptive", icon: "yes" as const },
  },
  {
    feature: "Interaction",
    traditional: { text: "One-way", icon: "none" as const },
    virtuara: { text: "Real-time 2-way", icon: "yes" as const },
  },
  {
    feature: "Emotional Support",
    traditional: { text: "None", icon: "none" as const },
    virtuara: { text: "AI-detected", icon: "yes" as const },
  },
  {
    feature: "Progress Tracking",
    traditional: { text: "Basic", icon: "warn" as const },
    virtuara: { text: "Deep Analytics", icon: "yes" as const },
  },
  {
    feature: "Availability",
    traditional: { text: "Schedule-based", icon: "warn" as const },
    virtuara: { text: "24/7 On-demand", icon: "yes" as const },
  },
];

function IconBadge({ type }: { type: "yes" | "none" | "warn" }) {
  if (type === "yes")
    return <Check className="w-4 h-4 inline" style={{ color: "var(--accent-emerald)" }} />;
  if (type === "none")
    return <X className="w-4 h-4 inline text-red-400" />;
  return <AlertTriangle className="w-3.5 h-3.5 inline" style={{ color: "var(--accent-amber)" }} />;
}

function FeatureDeepDive({
  section,
  index,
}: {
  section: (typeof deepDiveSections)[0];
  index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const varColor = section.color === "#00D4FF" ? "var(--semantic-info-text)" 
    : section.color === "#7B2FFF" ? "var(--accent-primary)" 
    : section.color === "#00FFB2" ? "var(--semantic-success-text)" 
    : "var(--semantic-warning-text)";

  return (
    <div ref={ref} className="py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center`}
      >
        {/* Text side */}
        <div className={`flex flex-col gap-6 ${section.imageLeft ? "lg:order-2 lg:pl-8" : "lg:pr-8"}`}>
          <span
            className="self-start px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-sm bg-bg-overlay border border-border-default"
            style={{ color: varColor }}
          >
            {section.badge}
          </span>
          <h3 className="font-display font-bold text-text-primary tracking-tight" style={{ fontSize: "clamp(32px, 3.5vw, 44px)", lineHeight: 1.1 }}>
            {section.title}
          </h3>
          <p className="text-text-secondary font-light text-[17px] leading-[1.6]">
            {section.subtitle}
          </p>
          <ul className="flex flex-col gap-5 mt-2">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-4">
                <span
                  className="mt-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-bg-surface border border-border-default shadow-sm"
                >
                  <Check className="w-[14px] h-[14px]" style={{ color: varColor }} />
                </span>
                <span className="text-text-secondary text-[16px] font-light leading-[1.6]">
                  {bullet}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Image side */}
        <div
          className={`relative h-[320px] lg:h-[440px] rounded-[24px] overflow-hidden border border-border-default shadow-lg ${section.imageLeft ? "lg:order-1" : ""}`}
        >
          <Image src={section.image} alt={section.title} fill className="object-cover opacity-90" priority={index === 0} />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, var(--bg-surface) 0%, transparent 40%, transparent 60%, var(--bg-elevated) 100%)`, opacity: 0.6 }}
          />
          <div className="absolute inset-0 mix-blend-overlay opacity-20" style={{ background: varColor }} />
        </div>
      </motion.div>

      {index < deepDiveSections.length - 1 && (
        <div
          className="mt-24 h-px w-full"
          style={{ background: "linear-gradient(to right, transparent, var(--border-default), transparent)" }}
        />
      )}
    </div>
  );
}

export default function FeaturesPageClient() {
  const tableRef = useRef(null);
  const tableInView = useInView(tableRef, { once: true, margin: "-80px" });

  return (
    <div className="font-body">
      {/* Hero */}
      <section className="pt-32 pb-20 text-center bg-bg-surface border-b border-border-faint relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-[100%] blur-[120px] opacity-[0.06] bg-semantic-info-text pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-6 relative z-10"
        >
          <span
            className="px-5 py-2 rounded-full text-[12px] font-bold tracking-widest uppercase bg-semantic-info-muted border border-semantic-info-border text-semantic-info-text shadow-sm"
          >
            Platform Features
          </span>
          <h1 className="font-display font-extrabold text-text-primary tracking-tight" style={{ fontSize: "clamp(40px, 5.5vw, 68px)", lineHeight: 1.05 }}>
            Built for <span className="bg-clip-text text-transparent bg-gradient-cta">Serious Learners</span>
          </h1>
          <p className="text-text-secondary font-light text-[18px] leading-[1.7] max-w-[620px]">
            Every feature in Virtuara AI is designed with one goal: helping you learn faster,
            deeper, and more enjoyably than ever before.
          </p>
        </motion.div>
      </section>

      {/* Feature deep dives */}
      <section className="max-w-7xl mx-auto px-6 bg-bg-page">
        {deepDiveSections.map((section, i) => (
          <FeatureDeepDive key={section.title} section={section} index={i} />
        ))}
      </section>

      {/* Comparison table */}
      <section ref={tableRef} className="py-32 bg-bg-surface border-t border-border-faint">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={tableInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-display font-bold text-4xl md:text-[44px] tracking-tight text-text-primary mb-5">
              Virtuara AI vs Traditional Learning
            </h2>
            <p className="text-text-secondary font-light text-[17px]">
              See why 12,400+ students chose Virtuara over video courses and textbooks
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={tableInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-[24px] overflow-hidden border border-border-default shadow-xl shadow-black/20"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-elevated border-b border-border-default">
                  <th className="px-8 py-6 font-display font-bold text-[15px] uppercase tracking-wider text-text-primary" style={{ width: "34%" }}>
                    Feature
                  </th>
                  <th className="text-center px-6 py-6 font-display font-bold text-[14px] uppercase tracking-wider text-text-secondary" style={{ width: "33%" }}>
                    Traditional Video
                  </th>
                  <th className="text-center px-6 py-6 font-display font-bold text-[14px] uppercase tracking-wider text-accent-primary" style={{ width: "33%" }}>
                    Virtuara AI ✦
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-border-faint last:border-0 ${i % 2 === 0 ? "bg-bg-page" : "bg-bg-surface"}`}
                  >
                    <td className="px-8 py-5 text-[15px] font-medium text-text-primary tracking-wide">{row.feature}</td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <IconBadge type={row.traditional.icon} />
                        <span className="text-[14px] text-text-secondary font-light">{row.traditional.text}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <IconBadge type={row.virtuara.icon} />
                        <span className="text-[14px] font-bold text-semantic-success-text">{row.virtuara.text}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
