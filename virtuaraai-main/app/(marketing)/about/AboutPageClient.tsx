"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const principles = [
  {
    icon: "💡",
    title: "Teach, Don't Just Tell",
    desc: "We designed Virtuara to ask questions, not just deliver answers. Real learning happens through dialogue, guided discovery, and making mistakes safely.",
    color: "#FFB300",
  },
  {
    icon: "❤️",
    title: "Emotion is the Engine of Learning",
    desc: "Without motivation and confidence, no amount of content helps. Virtuara reads your emotional state and responds with empathy, encouragement, and adaptive support.",
    color: "#00FFB2",
  },
  {
    icon: "🎯",
    title: "Mastery Over Speed",
    desc: "We reject the rush. Virtuara ensures you truly understand each concept before moving on — building lasting knowledge, not just exam-passing tricks.",
    color: "#7B2FFF",
  },
];

const timeline = [
  { year: "2024", event: "Research & AI architecture designed", note: "Foundation models evaluated, pedagogy framework created" },
  { year: "2025", event: "Beta launch with 1,000 learners", note: "Real feedback from students across 12 countries" },
  { year: "2026", event: "Full platform with 50+ subjects", note: "STEM, Humanities, Languages, and Professional skills" },
  { year: "2027", event: "Global expansion to 10 languages", note: "Making world-class education truly borderless" },
];

const galleryImages = [
  { src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80", alt: "Students collaborating" },
  { src: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80", alt: "Learning together" },
  { src: "https://images.unsplash.com/photo-1509869175650-a1d97972541a?w=600&q=80", alt: "Study session" },
];

export default function AboutPageClient() {
  const missionRef = useRef(null);
  const principlesRef = useRef(null);
  const timelineRef = useRef(null);
  const galleryRef = useRef(null);

  const missionInView = useInView(missionRef, { once: true, margin: "-80px" });
  const principlesInView = useInView(principlesRef, { once: true, margin: "-80px" });
  const timelineInView = useInView(timelineRef, { once: true, margin: "-80px" });
  const galleryInView = useInView(galleryRef, { once: true, margin: "-80px" });

  return (
    <div className="font-body">
      {/* Hero */}
      <section className="pt-32 pb-20 text-center bg-bg-surface border-b border-border-faint relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-[100%] blur-[140px] opacity-[0.05] bg-accent-primary pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-6 relative z-10"
        >
          <span className="px-5 py-2 rounded-full text-[12px] font-bold tracking-widest uppercase bg-accent-primary-muted border border-accent-primary-border text-accent-primary-text shadow-sm">
            Our Mission
          </span>
          <h1 className="font-display font-extrabold text-text-primary tracking-tight" style={{ fontSize: "clamp(36px, 4.5vw, 60px)", lineHeight: 1.1 }}>
            We Believe Everyone Deserves a{" "}
            <br className="max-md:hidden" />
            <span className="bg-clip-text text-transparent bg-gradient-cta">Great Teacher</span>
          </h1>
          <p className="text-text-secondary font-light text-[18px] leading-[1.7] max-w-[620px]">
            Virtuara AI was built on one simple idea: the quality of your education
            shouldn&apos;t depend on where you were born or how much you can afford.
          </p>
        </motion.div>
      </section>

      {/* Mission text */}
      <section ref={missionRef} className="py-24 max-w-[800px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={missionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="flex flex-col gap-6"
        >
          <p className="text-text-secondary leading-[1.8] text-[17px] font-light">
            Education has long been the great equalizer — in theory. In practice, your zip code,
            bank account, and social connections determine the quality of teachers you access.
            Virtuara AI exists to break this cycle permanently.
          </p>
          <p className="text-text-secondary leading-[1.8] text-[17px] font-light">
            We built an AI mentor that doesn&apos;t just deliver information — it teaches.
            It listens, adapts, encourages, and pushes you forward at exactly the right pace.
            Every student deserves a tutor who gets them, and that&apos;s exactly what Aria is.
          </p>

          {/* Quote callout */}
          <div
            className="relative p-10 rounded-[24px] mt-8 bg-bg-elevated border border-border-default shadow-md"
          >
            <span
              className="absolute -top-6 left-8 font-display text-[80px] font-black opacity-[0.06] select-none"
              style={{ color: "var(--accent-primary)" }}
            >
              &quot;
            </span>
            <p className="italic font-light text-text-primary text-[19px] leading-[1.6] tracking-[0.01em]">
              The best education system in the world isn&apos;t in Finland or Singapore —
              it&apos;s the one we can build for every single person, everywhere.
            </p>
            <p className="mt-6 text-[13px] font-bold tracking-widest uppercase" style={{ color: "var(--accent-primary)" }}>— The Virtuara AI Team</p>
          </div>
        </motion.div>
      </section>

      {/* Principles */}
      <section ref={principlesRef} className="py-32 bg-bg-page border-y border-border-faint">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={principlesInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-display font-bold text-4xl md:text-[44px] tracking-tight text-text-primary mb-4">
              The AI Mentor Philosophy
            </h2>
            <p className="text-text-secondary font-light text-[17px]">
              Three beliefs that drive every decision we make
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {principles.map((p, i) => {
              // Remap original hexes to standard variables
              const varColor = i === 0 ? "var(--semantic-warning-text)" : i === 1 ? "var(--semantic-success-text)" : "var(--accent-primary)";
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 40 }}
                  animate={principlesInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="p-10 rounded-[24px] flex flex-col gap-5 transition-all duration-300 bg-bg-elevated border border-border-default hover:border-border-strong shadow-lg shadow-black/30 group"
                >
                  <div className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-[28px] mb-2 relative bg-bg-surface border border-border-faint">
                     <div className="absolute inset-0 opacity-10 rounded-2xl" style={{ background: varColor }} />
                     <span className="relative z-10 transition-transform duration-300 group-hover:scale-110">{p.icon}</span>
                  </div>
                  <h3 className="font-display font-bold text-[22px] tracking-tight text-text-primary">{p.title}</h3>
                  <p className="text-text-secondary font-light leading-[1.7] text-[15px]">{p.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section ref={timelineRef} className="py-32 max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={timelineInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-bold text-4xl md:text-[44px] tracking-tight text-text-primary mb-4">
            Our Vision Timeline
          </h2>
          <p className="text-text-secondary font-light text-[17px]">Where we&apos;re headed</p>
        </motion.div>

        <div className="relative flex flex-col gap-0">
          <div
            className="absolute left-8 top-0 bottom-0 w-px"
            style={{ background: "linear-gradient(to bottom, var(--accent-primary), transparent)", opacity: 0.4 }}
          />
          {timeline.map((item, i) => (
            <motion.div
              key={item.year}
              initial={{ opacity: 0, x: -30 }}
              animate={timelineInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className="relative pl-[88px] pb-12"
            >
              <div
                className="absolute left-[18px] w-10 h-10 rounded-full flex items-center justify-center bg-bg-page border border-border-default shadow-sm"
              >
                <div className="w-3 h-3 rounded-full bg-accent-primary" />
              </div>

              <div
                className="p-8 rounded-[20px] bg-bg-elevated border border-border-default hover:border-border-strong transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-[14px] font-bold text-accent-primary tracking-widest">
                    {item.year}
                  </span>
                </div>
                <h4 className="font-display font-bold text-[20px] text-text-primary mb-2 tracking-tight">{item.event}</h4>
                <p className="text-[15px] text-text-secondary font-light leading-[1.6]">{item.note}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section ref={galleryRef} className="py-24 bg-bg-surface border-t border-border-faint">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {galleryImages.map((img, i) => (
              <motion.div
                key={img.src}
                initial={{ opacity: 0, y: 20 }}
                animate={galleryInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="relative h-[300px] rounded-[24px] overflow-hidden border border-border-default"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700 opacity-90"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, var(--bg-page), transparent 60%)" }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
