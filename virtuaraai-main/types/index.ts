// ─── Core Types ─────────────────────────────────────────────────────────────

export interface Message {
  id: number;
  role: "ai" | "user";
  content: string;
  timestamp: string;
}

export interface User {
  name: string;
  email: string;
  loggedIn: boolean;
}

export interface Skill {
  name: string;
  value: number;
  color: string;
}

export interface Recommendation {
  icon: string;
  title: string;
  desc: string;
  highlight?: boolean;
}

export interface Feature {
  icon: string;
  title: string;
  desc: string;
  image: string;
}

export interface Testimonial {
  initials: string;
  name: string;
  role: string;
  quote: string;
  gradientFrom: string;
  gradientTo: string;
}

export type AvatarState =
  | "explaining"
  | "waiting"
  | "correct"
  | "retrieving"
  | "idle";

export type ButtonVariant = "primary" | "ghost" | "glass" | "ghost-gold";
