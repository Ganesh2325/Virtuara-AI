import type { Metadata } from "next";
import AboutPageClient from "./AboutPageClient";

export const metadata: Metadata = {
  title: "About — Virtuara AI",
  description: "We believe everyone deserves a great teacher. Learn about the mission, philosophy, and vision behind Virtuara AI.",
};

export default function AboutPage() {
  return <AboutPageClient />;
}
