'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RepositoryItem } from '@/types/dashboard';
import { GitHubIcon, ShieldIcon, CloseIcon, CheckCircleIcon, AlertTriangleIcon } from '../Icons';

interface RepositoryDetailsModalProps {
  repo: RepositoryItem | null;
  onClose: () => void;
  onSyncRepo: (repoId: string, name: string) => void;
}

export function RepositoryDetailsModal({ repo, onClose, onSyncRepo }: RepositoryDetailsModalProps) {
  const router = useRouter();

  if (!repo) return null;

  const handleStartScan = () => {
    onClose();
    router.push(`/review?repo=${encodeURIComponent(repo.fullName)}&lang=${repo.language}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1420] border border-[#1e2638] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#1e2638] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#121826] border border-[#1e2638] text-zinc-200">
              <GitHubIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">{repo.name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-[#121826] text-zinc-300 border border-[#1e2638]">
                  {repo.isPrivate ? 'Private' : 'Public'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">{repo.fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        {repo.description && (
          <div className="text-xs text-zinc-300 bg-[#080b12] p-3.5 rounded-xl border border-[#1e2638] leading-relaxed">
            {repo.description}
          </div>
        )}

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#080b12] border border-[#1e2638] space-y-1">
            <span className="text-zinc-500 block text-[11px]">Owner / Organization</span>
            <span className="font-semibold text-zinc-200 font-mono">{repo.owner}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080b12] border border-[#1e2638] space-y-1">
            <span className="text-zinc-500 block text-[11px]">Primary Language</span>
            <span className="font-semibold text-blue-400 uppercase font-mono">{repo.language}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080b12] border border-[#1e2638] space-y-1">
            <span className="text-zinc-500 block text-[11px]">Default Branch</span>
            <span className="font-mono text-zinc-200">{repo.defaultBranch}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080b12] border border-[#1e2638] space-y-1">
            <span className="text-zinc-500 block text-[11px]">Open Pull Requests</span>
            <span className="font-semibold text-blue-400">{repo.openPRs} PRs active</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080b12] border border-[#1e2638] space-y-1">
            <span className="text-zinc-500 block text-[11px]">Security Health Score</span>
            <span
              className={`font-bold font-mono text-sm ${
                repo.healthScore >= 90
                  ? 'text-emerald-400'
                  : repo.healthScore >= 75
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {repo.healthScore}/100
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080b12] border border-[#1e2638] space-y-1">
            <span className="text-zinc-500 block text-[11px]">Last Scan Completed</span>
            <span className="font-mono text-zinc-400">{repo.lastScan}</span>
          </div>
        </div>

        {/* Security Status Banner */}
        <div
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs font-medium ${
            repo.vulnerabilityCount === 0
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}
        >
          {repo.vulnerabilityCount === 0 ? (
            <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangleIcon className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <span className="font-bold block">
              {repo.vulnerabilityCount === 0
                ? 'Security Status: Clean'
                : `Security Status: ${repo.vulnerabilityCount} Issue(s) Detected`}
            </span>
            <span className="text-[11px] opacity-80">
              {repo.vulnerabilityCount === 0
                ? 'No active vulnerabilities or credential leaks found.'
                : 'Run code security scan to view detailed findings and suggested fixes.'}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-[#1e2638] pt-4">
          <button
            onClick={() => onSyncRepo(repo.id, repo.fullName)}
            className="px-4 py-2 rounded-xl bg-[#121826] hover:bg-[#1a2336] text-zinc-300 text-xs font-medium border border-[#1e2638] transition-colors"
          >
            Trigger Sync
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#121826] hover:bg-[#1a2336] text-zinc-400 text-xs font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleStartScan}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-900/30 transition-all"
            >
              <ShieldIcon className="w-4 h-4" />
              <span>Run Security Review</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
