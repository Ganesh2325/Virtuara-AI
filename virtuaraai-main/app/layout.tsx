import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import CookieBanner from "@/components/shared/CookieBanner";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#F5F0E8",
};

export const metadata: Metadata = {
  metadataBase: new URL('https://virtuara.ai'),
  title: {
    default: 'Virtuara AI — Your Humanoid AI Mentor',
    template: '%s | Virtuara AI',
  },
  description: 'Learn faster with Aria, your personal AI mentor. Adaptive teaching, real-time voice interaction, and emotional intelligence — all in one platform.',
  keywords: ['AI tutor', 'AI mentor', 'adaptive learning', 'humanoid AI', 'personalized education', 'Virtuara AI'],
  openGraph: {
    title: 'Virtuara AI — Your Humanoid AI Mentor',
    description: 'Experience personalized learning with a humanoid AI mentor.',
    url: 'https://virtuara.ai',
    siteName: 'Virtuara AI',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Virtuara AI — Your Humanoid AI Mentor',
    description: 'AI mentor that adapts, teaches, and grows with you.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body bg-bg-page text-text-primary antialiased selection:bg-gold-100 selection:text-text-heading">
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
