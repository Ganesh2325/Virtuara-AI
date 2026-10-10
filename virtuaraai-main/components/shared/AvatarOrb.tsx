"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface AvatarOrbProps {
  size?: number | "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  speaking?: boolean;
  className?: string;
  showImage?: boolean;
}

export default function AvatarOrb({
  size = "md",
  animated = true,
  speaking = false,
  className = "",
  showImage = true,
}: AvatarOrbProps) {
  const sizeMap = {
    sm: 40,
    md: 80,
    lg: 160,
    xl: 240
  };
  const numericSize = typeof size === "number" ? size : sizeMap[size];

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: numericSize, height: numericSize }}
    >
      {/* Outer spinning gradient ring */}
      {animated && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full"
          style={{
            background: "var(--text-gold-deep)",
            padding: "2px",
            borderRadius: "50%",
          }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{ background: "var(--bg-page)" }}
          />
        </motion.div>
      )}

      {/* Inner glow */}
      <div
        className="absolute inset-4 rounded-full"
        style={{
          background: "radial-gradient(circle, var(--text-gold-deep) 0%, transparent 70%)",
          opacity: 0.1
        }}
      />

      {/* Speaking pulse ring */}
      {speaking && (
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full border-2 border-border-gold-faint"
          style={{ inset: -6 }}
        />
      )}

      {/* Avatar image container */}
      <div
        className="relative rounded-full overflow-hidden shadow-inner"
        style={{
          width: (typeof size === "number" ? size : sizeMap[size]) * 0.82,
          height: (typeof size === "number" ? size : sizeMap[size]) * 0.82,
          border: "1px solid var(--border-subtle)",
        }}
      >
        {showImage && (
          <Image
            src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80"
            alt="AI Mentor Avatar"
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
          />
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-bg-surface/40 to-transparent opacity-60"
        />
      </div>

      {/* Sound wave bars - shown when speaking */}
      {speaking && (
        <div className="absolute bottom-4 flex items-end gap-[3px]">
          {[14, 22, 28, 20, 14].map((maxH, i) => (
            <motion.div
              key={i}
              animate={{ height: [4, maxH, 4] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
              className="w-[3px] bg-text-gold-deep/80 rounded-full shadow-sm"
            />
          ))}
        </div>
      )}
    </div>
  );
}
