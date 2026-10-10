import Link from "next/link";
import { Twitter, Linkedin, Github } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "About", href: "/about" },
    { label: "Pricing", href: "/pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

const socials = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
];

export default function Footer() {
  return (
    <footer className="bg-bg-surface border-t border-border-subtle font-body antialiased">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-[2px] mb-6">
              <div className="w-4 h-4 bg-text-gold-deep rounded-sm rotate-45 mr-1.5 shadow-sm" />
              <span className="font-display font-bold tracking-tight text-[22px] text-text-heading antialiased">Virtuara</span>
              <span className="font-display font-bold tracking-tight text-[22px] text-text-gold-deep antialiased">AI</span>
            </div>
            <p className="text-text-secondary text-[15px] font-bold leading-[1.7] mb-8 pr-4 antialiased">
              The future of learning — personalized, institutional-grade, and always available.
            </p>
            <div className="flex items-center gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-text-tertiary bg-bg-page border border-border-subtle hover:text-text-gold-deep hover:border-border-gold transition-all duration-500 shadow-sm"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-text-gold-deep font-display font-bold text-[13px] uppercase tracking-[0.15em] mb-7 antialiased">{category}</h4>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-text-secondary text-[15px] font-bold hover:text-text-gold-deep transition-colors duration-300 antialiased"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border-subtle"
        >
          <span className="text-text-tertiary text-[13px] font-bold tracking-tight antialiased">© 2026 Virtuara AI · Built for institutional excellence</span>
          <span className="font-mono text-[12px] font-bold text-text-gold-deep uppercase tracking-[0.15em] antialiased">
            v2.1.0-gold
          </span>
        </div>
      </div>
    </footer>
  );
}
