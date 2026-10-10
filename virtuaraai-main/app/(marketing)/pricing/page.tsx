"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { CheckCircle2, ChevronDown, HelpCircle, Star } from "lucide-react";
import GlowButton from "@/components/shared/GlowButton";

const faqs = [
  {
    q: "Can I switch plans later?",
    a: "Yes, you can upgrade or downgrade your plan at any time. If you upgrade, the change is immediate. If you downgrade, the change takes effect at the end of your current billing cycle."
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards, PayPal, and Apple Pay. For Team plans, we also support bank transfers and invoicing."
  },
  {
    q: "Is there a free trial?",
    a: "Yes! The Pro plan comes with a 7-day free trial. You can explore all premium features risk-free before deciding."
  },
  {
    q: "What subjects are available?",
    a: "We offer over 50 subjects ranging from core sciences (Math, Physics, Biology) to humanities, computer science, and creative arts. Our library is constantly expanding."
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. There are no long-term contracts for individual plans. You can cancel your subscription with a single click from your settings."
  }
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border-subtle last:border-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-7 px-8 bg-bg-surface hover:bg-bg-overlay/10 transition-all text-left group"
      >
        <span className="text-[17px] font-semibold text-text-heading flex items-center gap-4 antialiased">
          <HelpCircle className="w-5 h-5 text-text-gold-deep opacity-80" />
          {q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "circOut" }}
          className="text-text-tertiary"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-8 pt-2 text-[16px] leading-[1.65] text-text-secondary font-medium antialiased">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const cardsRef = useRef(null);
  const cardsInView = useInView(cardsRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-bg-page pt-32 pb-24 font-body overflow-hidden antialiased relative">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gold-500/5 blur-[140px]" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-gold-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-bg-surface/80 border border-border-gold text-text-gold-deep text-[11px] font-bold tracking-[0.15em] uppercase mb-8 antialiased shadow-sm"
          >
            <Star className="w-3.5 h-3.5" /> Institutional Access
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display font-semibold text-[64px] text-text-heading tracking-tight leading-[1.02] mb-8 antialiased"
          >
            Transparent Plans for Every <span className="text-text-gold-deep">Explorer</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[19px] text-text-secondary leading-[1.65] font-medium antialiased"
          >
            Choose the perfect path for your mastery. From free exploration to deep institutional integration with our most advanced mentor models.
          </motion.p>
        </div>

        <div className="flex justify-center items-center gap-5 mb-20">
          <div className="bg-bg-surface border border-border-subtle p-1.5 rounded-full flex items-center relative shadow-sm backdrop-blur-sm">
            <button
              onClick={() => setBilling("monthly")}
              className={`relative px-10 py-3 rounded-full text-[13px] font-bold tracking-tight transition-all duration-500 z-10 ${billing === "monthly" ? "text-white" : "text-text-secondary hover:text-text-heading"
                }`}
            >
              Quarterly Logic
              {billing === "monthly" && (
                <motion.div
                  layoutId="billing-pill"
                  className="absolute inset-0 bg-text-gold-deep rounded-full -z-10 shadow-sm"
                  transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
                />
              )}
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`relative px-10 py-3 rounded-full text-[13px] font-bold tracking-tight transition-all duration-500 z-10 ${billing === "annual" ? "text-white" : "text-text-secondary hover:text-text-heading"
                }`}
            >
              Annual Protocol
              {billing === "annual" && (
                <motion.div
                  layoutId="billing-pill"
                  className="absolute inset-0 bg-text-gold-deep rounded-full -z-10 shadow-sm"
                  transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
                />
              )}
            </button>
          </div>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="px-4 py-1.5 rounded-lg bg-gold-500/10 border border-border-gold text-text-gold-deep text-[11px] font-bold tracking-tight antialiased"
          >
            -30% Legacy Discount
          </motion.span>
        </div>

        {/* Pricing Cards */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32 items-stretch">
          {/* FREE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={cardsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="bg-bg-surface border border-border-subtle rounded-3xl p-10 flex flex-col items-start hover:border-border-gold transition-all duration-500 shadow-sm antialiased group"
          >
            <h3 className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] mb-4">Explorer</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-[48px] font-display font-bold text-text-heading tracking-tight">$0</span>
              <span className="text-[15px] text-text-tertiary font-bold uppercase tracking-wider">/ mo</span>
            </div>
            <p className="text-[15px] text-text-secondary mb-10 leading-[1.6] font-bold">Begin your journey with the fundamental cognitive architectures.</p>

            <div className="space-y-4 mb-12 flex-1 w-full">
              {[
                "Every subject access",
                "Basic neural interactions",
                "Foundational trajectory",
                "Community vault access",
                "Standard STT/TTS models"
              ].map((f) => (
                <div key={f} className="flex items-start gap-4">
                  <CheckCircle2 className="w-5 h-5 text-text-gold-deep flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[14px] text-text-primary font-bold">{f}</span>
                </div>
              ))}
            </div>

            <GlowButton variant="ghost-gold" className="w-full" href="/signup">
              Start Exploring
            </GlowButton>
          </motion.div>

          {/* PRO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={cardsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="relative bg-bg-surface border-2 border-border-gold rounded-3xl p-10 flex flex-col items-start shadow-lg z-20 antialiased"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-text-gold-deep text-white text-[10px] font-black uppercase tracking-[0.15em] shadow-sm">
              Most Advanced
            </div>

            <h3 className="text-[11px] font-bold text-text-gold-deep uppercase tracking-[0.2em] mb-4">Adept</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <AnimatePresence mode="wait">
                <motion.span
                  key={billing}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-[48px] font-display font-bold text-text-heading tracking-tight"
                >
                  ${billing === "monthly" ? "19" : "13"}
                </motion.span>
              </AnimatePresence>
              <span className="text-[15px] text-text-tertiary font-bold uppercase tracking-wider">/ mo</span>
            </div>
            <p className="text-[15px] text-text-primary mb-10 leading-[1.6] font-bold">Unlock high-performance mastery with absolute vault priority.</p>

            <div className="space-y-4 mb-12 flex-1 w-full">
              {[
                "Unlimited neural sessions",
                "Quantum-latency streaming",
                "Full catalog (Pro modules)",
                "Advanced neuro-analytics",
                "Emotional IQ integration",
                "Priority concierge access",
                "Custom mentor synthesis"
              ].map((f) => (
                <div key={f} className="flex items-start gap-4">
                  <CheckCircle2 className="w-5 h-5 text-text-gold-deep flex-shrink-0 mt-0.5" />
                  <span className="text-[14px] text-text-primary font-bold">{f}</span>
                </div>
              ))}
            </div>

            <GlowButton variant="primary" className="w-full" href="/signup">
              Upgrade Now
            </GlowButton>
          </motion.div>

          {/* TEAM */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={cardsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="bg-bg-surface border border-border-subtle rounded-3xl p-10 flex flex-col items-start hover:border-border-gold transition-all duration-500 shadow-sm antialiased group"
          >
            <h3 className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] mb-4">Command</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-[48px] font-display font-bold text-text-heading tracking-tight">$49</span>
              <span className="text-[15px] text-text-tertiary font-bold uppercase tracking-wider">/ mo</span>
            </div>
            <p className="text-[15px] text-text-secondary mb-10 leading-[1.6] font-bold">Enterprise intelligence for elite schools and organizations.</p>

            <div className="space-y-4 mb-12 flex-1 w-full text-left">
              {[
                "Institutional bulk licensing",
                "LMS data synchronization",
                "Organizational metrics",
                "Custom curriculum design",
                "Identity SAML integration",
                "White-glove deployment"
              ].map((f) => (
                <div key={f} className="flex items-start gap-4 text-left">
                  <CheckCircle2 className="w-5 h-5 text-text-gold-deep flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[14px] text-text-primary font-bold text-left">{f}</span>
                </div>
              ))}
            </div>

            <GlowButton variant="ghost-gold" className="w-full" href="/contact">
              Inquire Now
            </GlowButton>
          </motion.div>
        </div>

        {/* FAQs */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-semibold text-[44px] text-text-heading tracking-tight mb-6 antialiased">Common Inquiries</h2>
            <p className="text-text-secondary text-[18px] font-medium antialiased">Everything you need to know about our institutional-grade services.</p>
          </div>

          <div className="bg-bg-surface border border-border-subtle rounded-3xl overflow-hidden shadow-sm">
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} q={faq.q} a={faq.a} />
            ))}
          </div>

          <p className="text-center mt-12 text-text-tertiary font-bold text-[15px]">
            Have more questions? <Link href="/contact" className="text-text-gold-deep hover:text-text-gold font-bold underline decoration-text-gold-deep/20 underline-offset-4 transition-all uppercase tracking-widest">Speak to an advisor →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
