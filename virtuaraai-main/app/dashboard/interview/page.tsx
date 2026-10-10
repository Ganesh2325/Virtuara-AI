"use client";

import { Briefcase } from "lucide-react";
import ResumeInterview from "@/components/dashboard/interview/ResumeInterview";

export default function InterviewPage() {
  return (
    <div className="h-full flex flex-col bg-bg-page overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle bg-bg-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <Briefcase className="w-4 h-4 text-text-gold-deep" />
          <span className="font-bold text-[14px] text-text-heading">AI Mock Interview</span>
        </div>
        <a href="/dashboard" className="text-[12px] font-bold text-text-tertiary hover:text-text-gold-deep">
          Exit
        </a>
      </div>
      <div className="flex-1 overflow-hidden">
        <ResumeInterview />
      </div>
    </div>
  );
}
