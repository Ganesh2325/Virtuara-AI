import type { Metadata } from "next";
import FeaturesPageClient from "./FeaturesPageClient";

export const metadata: Metadata = {
  title: "Features — Virtuara AI",
  description: "Built for serious learners. Explore every feature that makes Virtuara AI the most advanced learning platform available.",
};

export default function FeaturesPage() {
  return <FeaturesPageClient />;
}
