"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

const stats = [
  { value: "12,400+", label: "Active Learners", end: 12400, suffix: "+" },
  { value: "98%", label: "Student Satisfaction", end: 98, suffix: "%" },
  { value: "50+", label: "Subjects Covered", end: 50, suffix: "+" },
  { value: "3x", label: "Faster Learning", end: 3, suffix: "x" },
];

function CountUp({ end, suffix, started }: { end: number; suffix: string; started: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const duration = 2000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [end, started]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function StatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-bg-page font-body border-y border-border-faint antialiased">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              className="text-center pb-8 border-b border-border-default relative group"
            >
              <div
                className="font-display font-semibold transition-all duration-300 group-hover:scale-105"
                style={{ 
                  fontSize: "clamp(44px, 5vw, 64px)",
                  color: "var(--text-gold-deep)"
                }}
              >
                {inView ? (
                  <CountUp end={stat.end} suffix={stat.suffix} started={inView} />
                ) : (
                  "0" + stat.suffix
                )}
              </div>
              <p className="text-text-tertiary font-bold tracking-[0.12em] uppercase text-[11px] mt-2">{stat.label}</p>
              
              {/* Highlight bar on hover */}
              <div className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-0 h-[1px] bg-gold-400 transition-all duration-500 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
