import React from 'react';
import { ReviewSummary } from '@/types/dashboard';
import { CheckCircleIcon, AlertTriangleIcon } from '../Icons';

interface SecurityScoreGaugeProps {
  summary: ReviewSummary;
  analyzedAt: string;
}

export function SecurityScoreGauge({ summary, analyzedAt }: SecurityScoreGaugeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
    if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    return 'text-red-400 border-red-500/40 bg-red-950/20';
  };

  const getStatusLabel = (score: number) => {
    if (score >= 90) return 'Excellent Security Standing';
    if (score >= 80) return 'Good Security Standing';
    if (score >= 60) return 'Moderate Security Risk';
    if (score >= 40) return 'High Security Risk';
    return 'Critical Security Risk';
  };

  return (
    <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 space-y-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2638] pb-4">
        <div className="flex items-center gap-3">
          {summary.overallScore >= 80 ? (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-white">Security Score & Issue Overview</h3>
            <p className="text-xs text-zinc-400 font-mono">Analyzed at {analyzedAt}</p>
          </div>
        </div>

        {/* Security Score Badge */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${getScoreColor(summary.overallScore)} shadow-inner`}>
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-wider">Score</span>
            <span className="text-xs font-medium text-zinc-300">{getStatusLabel(summary.overallScore)}</span>
          </div>
          <span className="text-2xl font-extrabold font-mono tracking-tight">
            {summary.overallScore}/100
          </span>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-[#080b12] border border-[#1e2638] space-y-1">
          <span className="text-zinc-400 block font-medium">Critical Issues</span>
          <span className="font-extrabold text-red-400 text-lg font-mono">{summary.criticalCount}</span>
        </div>
        <div className="p-3 rounded-lg bg-[#080b12] border border-[#1e2638] space-y-1">
          <span className="text-zinc-400 block font-medium">High Issues</span>
          <span className="font-extrabold text-orange-400 text-lg font-mono">{summary.highCount}</span>
        </div>
        <div className="p-3 rounded-lg bg-[#080b12] border border-[#1e2638] space-y-1">
          <span className="text-zinc-400 block font-medium">Medium Issues</span>
          <span className="font-extrabold text-amber-400 text-lg font-mono">{summary.mediumCount}</span>
        </div>
        <div className="p-3 rounded-lg bg-[#080b12] border border-[#1e2638] space-y-1">
          <span className="text-zinc-400 block font-medium">Low / Info</span>
          <span className="font-extrabold text-blue-400 text-lg font-mono">{summary.lowCount}</span>
        </div>
      </div>
    </div>
  );
}
