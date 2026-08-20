'use client';

import React from 'react';
import { PlusIcon, ShieldIcon } from './Icons';

interface DashboardHeroProps {
  onNewReviewClick: () => void;
}

export function DashboardHero({ onNewReviewClick }: DashboardHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0d1322] via-[#0f172a] to-[#0b101d] border border-[#1e2638] p-6 lg:p-8">
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
            <ShieldIcon className="w-3.5 h-3.5" />
            <span>Overview</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
            Code security at a glance
          </h1>
          <p className="text-sm lg:text-base text-zinc-400 leading-relaxed">
            CodeSentinel continuously monitors connected GitHub repositories, analyzes pull request diffs, and detects critical security vulnerabilities, logic bugs, and maintainability concerns before reaching production.
          </p>
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={onNewReviewClick}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-md shadow-blue-900/30 transition-all transform active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Review</span>
          </button>
        </div>
      </div>
    </div>
  );
}
