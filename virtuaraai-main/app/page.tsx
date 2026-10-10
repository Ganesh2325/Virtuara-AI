import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";

// Lazy load below-the-fold sections
const StatsSection = dynamic(() => import("@/components/landing/StatsSection"), { ssr: true });
const HowItWorksSection = dynamic(() => import("@/components/landing/HowItWorksSection"), { ssr: true });
const FeaturesSection = dynamic(() => import("@/components/landing/FeaturesSection"), { ssr: true });
const TestimonialsSection = dynamic(() => import("@/components/landing/TestimonialsSection"), { ssr: true });
const CTASection = dynamic(() => import("@/components/landing/CTASection"), { ssr: true });

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Virtuara AI — Meet Your AI Mentor That Never Stops",
  description:
    "Experience personalized learning with a humanoid AI mentor that adapts to your pace, understands your emotions, and teaches like the best teacher you've ever had.",
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
