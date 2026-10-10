"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";

const features = [
  {
    icon: "🤖",
    title: "Humanoid AI Mentor",
    desc: "Interact with a lifelike 3D avatar powered by MetaHuman technology. Your mentor speaks, reacts, and teaches like a real human.",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80",
    color: "#00D4FF",
  },
  {
    icon: "🧠",
    title: "Adaptive Intelligence",
    desc: "Our AI tracks your knowledge gaps in real time and dynamically adjusts the difficulty, speed, and teaching style to match your learning curve.",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80",
    color: "#7B2FFF",
  },
  {
    icon: "❤️",
    title: "Emotional Awareness",
    desc: "Virtuara detects frustration, confusion, and confidence through your responses and voice tone — then adjusts its teaching approach instantly.",
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80",
    color: "#00FFB2",
  },
  {
    icon: "📚",
    title: "Structured Mastery Path",
    desc: "Each session follows a pedagogically designed progression — concept introduction, guided practice, challenge questions, and mastery verification.",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80",
    color: "#FFB300",
  },
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" ref={ref} className="py-24 bg-bg-page font-body antialiased">
      <div className="max-w-7xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="font-display font-semibold text-4xl md:text-5xl text-text-heading mb-6 tracking-tight antialiased">
            Everything You Need to Excel
          </h2>
          <p className="text-text-secondary font-bold text-[18px] max-w-[500px] mx-auto leading-relaxed antialiased">
            Systematically designed for high-performance learners who demand institutional results.
          </p>
        </motion.div>

        {/* 2x2 Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              className="rounded-2xl overflow-hidden flex flex-col transition-all duration-500 group bg-bg-surface border border-border-subtle hover:border-border-gold hover:bg-bg-overlay hover:-translate-y-1.5 p-8 shadow-sm antialiased"
            >
              {/* Card body */}
              <div className="flex flex-col gap-4 relative z-10 flex-1">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-[28px] bg-bg-overlay border border-border-subtle group-hover:bg-gold-500/10 group-hover:border-border-gold transition-colors"
                >
                  {feat.icon}
                </div>
                <h3 className="font-display font-semibold text-[23px] text-text-heading tracking-tight mt-2 antialiased">{feat.title}</h3>
                <p className="font-body text-[15px] text-text-secondary leading-[1.7] font-bold antialiased">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
