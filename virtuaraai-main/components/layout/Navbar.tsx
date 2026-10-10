"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import GlowButton from "@/components/shared/GlowButton";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();


  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          background: "rgba(245,240,232,0.85)",
          borderBottom: "1px solid var(--border-faint)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <div className="w-2 h-2 bg-gold-500 rounded-[1px] rotate-45 mr-3 shrink-0" />
            <span
              className="font-display font-semibold text-[22px] text-text-heading tracking-tight"
            >
              Virtuara AI
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[14px] font-body px-3 py-1.5 rounded-md transition-all duration-200 ${
                    isActive
                      ? "text-text-heading font-medium"
                      : "text-text-tertiary hover:text-text-primary hover:bg-bg-active font-normal"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <GlowButton href="/login" variant="ghost" className="px-5 py-2">
              Log in
            </GlowButton>
            <GlowButton href="/signup" variant="primary" className="px-5 py-2">
              Get Started
            </GlowButton>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8"
            style={{ background: "var(--bg-page)", backdropFilter: "blur(20px)" }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="font-display font-bold text-3xl text-text-primary hover:text-text-gold-deep transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-4 mt-8 w-full max-w-xs px-8">
              <GlowButton href="/login" variant="ghost" onClick={() => setMenuOpen(false)} className="w-full justify-center">
                Log in
              </GlowButton>
              <GlowButton href="/signup" variant="primary" onClick={() => setMenuOpen(false)} className="w-full justify-center">
                Get Started Free
              </GlowButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
