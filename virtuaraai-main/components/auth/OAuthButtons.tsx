"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";

interface OAuthButtonsProps {
  mode?: "signup" | "login";
  callbackUrl?: string;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.337 17.64 11.945 17.64 9.2z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
    <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

export default function OAuthButtons({ callbackUrl = "/dashboard" }: OAuthButtonsProps) {
  const [pulsing, setPulsing] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPulsing(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      // Use absolute URL so NextAuth doesn't reject it as external
      const absoluteCallback =
        typeof window !== "undefined"
          ? `${window.location.origin}${callbackUrl}`
          : callbackUrl;
      await signIn("google", { callbackUrl: absoluteCallback });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <motion.button
        whileTap={{ scale: 0.99 }}
        onClick={handleGoogle}
        disabled={loading}
        className={`w-full h-[48px] flex items-center justify-center gap-[12px] bg-bg-surface text-text-primary font-body text-[15px] font-bold rounded-lg border border-border-subtle transition-all duration-300 hover:bg-bg-active hover:border-border-gold disabled:opacity-60 disabled:cursor-not-allowed ${pulsing ? "animate-oauth-attention" : ""} antialiased shadow-sm hover:shadow-md`}
      >
        {loading ? (
          <div className="w-4 h-4 rounded-full border-2 border-border-default border-t-accent-primary animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {loading ? "Connecting..." : `Continue with Google`}
      </motion.button>

      <p className="text-center text-xs mt-2 text-text-secondary">
        {process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED

        }
      </p>
    </div>
  );
}
