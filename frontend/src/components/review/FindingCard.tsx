'use client';

import React, { useState } from 'react';
import { SecurityFinding } from '@/types/dashboard';
import { SeverityBadge } from './SeverityBadge';
import { CopyIcon, CheckIcon } from '../Icons';

interface FindingCardProps {
  finding: SecurityFinding;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export function FindingCard({ finding, onShowToast }: FindingCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyFix = () => {
    if (!finding.suggestedFix) return;
    navigator.clipboard.writeText(finding.suggestedFix);
    setCopied(true);
    if (onShowToast) {
      onShowToast('Suggested fix copied to clipboard', 'success');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#0f1420] border border-[#1e2638] space-y-4 shadow-sm hover:border-[#2a3650] transition-colors">
      {/* Finding Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2638] pb-3">
        <div className="flex items-center gap-2.5">
          <SeverityBadge severity={finding.severity} />
          <h4 className="text-sm font-semibold text-white tracking-tight">{finding.title}</h4>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-[#080b12] px-2.5 py-1 rounded-lg border border-[#1e2638]">
          <span>{finding.file}</span>
          <span className="text-blue-400 font-semibold">:L{finding.line}</span>
        </div>
      </div>

      {/* Category & Confidence */}
      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <div>
          Category: <span className="text-zinc-200 font-medium">{finding.category}</span>
        </div>
        <span>•</span>
        <div>
          Confidence:{' '}
          <span className="text-zinc-200 font-medium capitalize">{finding.confidence}</span>
        </div>
      </div>

      {/* Explanation & Impact */}
      <div>
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
          Explanation & Impact
        </span>
        <p className="text-xs text-zinc-300 leading-relaxed bg-[#080b12] p-3 rounded-lg border border-[#1e2638]">
          {finding.impact}
        </p>
      </div>

      {/* Evidence Code */}
      {finding.evidence && (
        <div>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Evidence Line
          </span>
          <div className="p-3 rounded-lg bg-[#080b12] border border-[#1e2638] font-mono text-xs text-red-300 overflow-x-auto">
            <code>{finding.evidence}</code>
          </div>
        </div>
      )}

      {/* Suggested Fix */}
      {finding.suggestedFix && (
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Suggested Fix
            </span>
            <button
              onClick={handleCopyFix}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 bg-[#141b2b] hover:bg-[#1d273e] border border-[#1e2638] transition-colors"
              aria-label="Copy suggested fix code to clipboard"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Fix</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 rounded-lg bg-[#05070d] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
            {finding.suggestedFix}
          </pre>
        </div>
      )}
    </div>
  );
}
