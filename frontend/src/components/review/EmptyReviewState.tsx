import React from 'react';
import { ShieldIcon, CodeIcon, CheckCircleIcon } from '../Icons';

interface EmptyReviewStateProps {
  onLoadSample: () => void;
}

export function EmptyReviewState({ onLoadSample }: EmptyReviewStateProps) {
  return (
    <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-8 text-center space-y-6 shadow-md">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-900/20">
        <ShieldIcon className="w-8 h-8 text-blue-500" />
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <h3 className="text-lg font-bold text-white tracking-tight">
          Ready for Security Analysis
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Paste your code snippet above or load a sample to trigger AI static analysis, rule verification, and vulnerability scanning.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left text-xs">
        <div className="p-3.5 rounded-lg bg-[#080b12] border border-[#1e2638] space-y-1">
          <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
            <CodeIcon className="w-4 h-4" />
            <span>6 Languages</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Supports TypeScript, JavaScript, Python, Java, C++, and Go.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#080b12] border border-[#1e2638] space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <CheckCircleIcon className="w-4 h-4" />
            <span>Rule Engines</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Combined static analysis rules & Gemini AI engine validation.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#080b12] border border-[#1e2638] space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <ShieldIcon className="w-4 h-4" />
            <span>Actionable Fixes</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Provides evidence lines and one-click copyable code fixes.
          </p>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={onLoadSample}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141b2b] hover:bg-[#1d273e] border border-[#1e2638] text-xs font-semibold text-zinc-200 transition-colors"
        >
          <CodeIcon className="w-4 h-4 text-blue-400" />
          <span>Load Sample TypeScript Vulnerability</span>
        </button>
      </div>
    </div>
  );
}
