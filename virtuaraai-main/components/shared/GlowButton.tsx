"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ButtonVariant } from "@/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface GlowButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export default function GlowButton({
  children,
  variant = "primary",
  href,
  onClick,
  loading = false,
  className = "",
  type = "button",
  disabled = false,
}: GlowButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-body font-medium rounded-md transition-all duration-220 cursor-pointer select-none text-[15px] tracking-tight";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[#5C4100] text-[#F5F0E8] px-6 py-[12px] border border-[#5C4100] hover:bg-[#4A3200] hover:border-[#4A3200] hover:shadow-[0_8px_28px_rgba(92,65,0,0.30)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed antialiased font-bold",
    ghost:
      "bg-transparent border border-border-default text-text-primary px-6 py-[12px] hover:bg-bg-elevated disabled:opacity-50 disabled:cursor-not-allowed",
    glass:
      "bg-gold-500/5 border border-border-gold text-text-gold-deep px-6 py-[12px] hover:bg-gold-500/10 disabled:opacity-50 disabled:cursor-not-allowed",
    "ghost-gold":
      "bg-transparent border border-border-gold-faint text-text-gold-deep px-6 py-[12px] hover:bg-gold-500/5 hover:border-border-gold disabled:opacity-50 disabled:cursor-not-allowed",
  };

  const motionProps = {
    whileHover: disabled || loading ? {} : { y: -1 },
    whileTap: disabled || loading ? {} : { y: 0 },
  };

  const content = loading ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin text-current opacity-70" />
      <span>Wait...</span>
    </>
  ) : (
    children
  );

  if (href) {
    return (
      <motion.div {...motionProps} className="inline-block">
        <Link href={href} className={cn(base, variants[variant], className)}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      {...motionProps}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(base, variants[variant], className)}
    >
      {content}
    </motion.button>
  );
}
