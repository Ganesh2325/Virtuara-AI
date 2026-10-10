"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    initials: "AK",
    name: "Aryan Kapoor",
    role: "Engineering Student",
    quote:
      "Virtuara completely changed how I study. Aria explains concepts in a way that actually makes sense — it's like having a brilliant tutor available at 2am when I'm cramming for exams.",
    from: "#00D4FF",
    to: "#7B2FFF",
  },
  {
    initials: "SP",
    name: "Shreya Patel",
    role: "Pre-Med Student",
    quote:
      "I was struggling with Biochemistry and nothing was working. After two weeks with Virtuara, I aced my midterm. The emotional awareness feature is genuinely game-changing.",
    from: "#7B2FFF",
    to: "#00FFB2",
  },
  {
    initials: "MJ",
    name: "Marcus Johnson",
    role: "Self-taught Developer",
    quote:
      "I've tried every learning platform out there. Nothing comes close. The AI actually catches when I'm confused and adjusts — it's not just a fancy chatbot, it genuinely teaches.",
    from: "#FFB300",
    to: "#00D4FF",
  },
];

export default function TestimonialsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-32 bg-bg-page font-body antialiased">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="font-display font-semibold text-4xl md:text-[48px] tracking-tight text-text-heading mb-6 antialiased">
            What Our Members Are Saying
          </h2>
          <p className="text-text-secondary font-medium text-[18px] antialiased">
            Real stories of transformation through personalized luxury intelligence.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="flex flex-col gap-6 p-8 rounded-2xl transition-all duration-500 bg-bg-surface border border-border-subtle hover:border-gold-300 shadow-sm hover:shadow-2xl hover:shadow-gold-900/5 group antialiased"
            >
              {/* Stars */}
              <div className="flex gap-[6px]">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-[15px] h-[15px] fill-gold-500 text-gold-500 group-hover:scale-110 transition-transform" style={{ transitionDelay: `${j * 50}ms` }} />
                ))}
              </div>

              {/* Quote */}
              <p className="font-bold italic text-text-secondary leading-[1.7] text-[15px] flex-1 tracking-[0.01em] antialiased">
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4 mt-2">
                <div
                  className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0 shadow-sm border border-border-subtle"
                  style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
                >
                  {t.initials}
                </div>
                <div className="flex flex-col">
                  <p className="text-text-heading text-[16px] font-semibold font-display tracking-tight antialiased">{t.name}</p>
                  <p className="text-text-tertiary text-[11px] uppercase tracking-[0.15em] font-bold mt-1 antialiased">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
