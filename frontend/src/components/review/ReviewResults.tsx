import React from 'react';
import { ReviewResult } from '@/types/dashboard';
import { SecurityScoreGauge } from './SecurityScoreGauge';
import { FindingCard } from './FindingCard';
import { CheckCircleIcon } from '../Icons';

interface ReviewResultsProps {
  result: ReviewResult;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export function ReviewResults({ result, onShowToast }: ReviewResultsProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview & Security Score Gauge */}
      <SecurityScoreGauge summary={result.summary} analyzedAt={result.analyzedAt} />

      {/* Detailed Findings */}
      {result.findings.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Detailed Security Findings ({result.findings.length})
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              Language: {result.language.toUpperCase()}
            </span>
          </div>

          <div className="space-y-4">
            {result.findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} onShowToast={onShowToast} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0f1420] border border-emerald-500/30 p-8 text-center space-y-3 shadow-lg">
          <CheckCircleIcon className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Zero Vulnerabilities Detected</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            No security issues, credential leaks, or risky code patterns were identified in this submission.
          </p>
        </div>
      )}
    </div>
  );
}
