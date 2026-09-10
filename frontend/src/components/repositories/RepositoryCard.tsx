'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RepositoryItem } from '@/types/dashboard';
import { GitHubIcon, ShieldIcon, ExternalLinkIcon } from '../Icons';

interface RepositoryCardProps {
  repo: RepositoryItem;
  onViewDetails: (repo: RepositoryItem) => void;
  onSyncRepo: (repoId: string, name: string) => void;
}

export function RepositoryCard({ repo, onViewDetails, onSyncRepo }: RepositoryCardProps) {
  const router = RouterHook();

  function RouterHook() {
    return useRouter();
  }

  const handleScanCode = () => {
    router.push(`/review?repo=${encodeURIComponent(repo.fullName)}&lang=${repo.language}`);
  };

  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'typescript':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'python':
        return 'bg-[#3572A5]/10 text-[#388bfd] border-[#3572A5]/20';
      case 'javascript':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'java':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'cpp':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'go':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 75) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 space-y-4 shadow-sm hover:border-[#2b3752] transition-colors flex flex-col justify-between">
      <div className="space-y-3">
        {/* Repo Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#121826] border border-[#1e2638] text-zinc-300">
              <GitHubIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight leading-snug">
                {repo.name}
              </h3>
              <p className="text-xs text-zinc-400 font-mono truncate max-w-[180px]">
                {repo.fullName}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-[#121826] text-zinc-300 border border-[#1e2638]">
            {repo.isPrivate ? 'Private' : 'Public'}
          </span>
        </div>

        {/* Description */}
        {repo.description && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {repo.description}
          </p>
        )}

        {/* Metrics Box */}
        <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg bg-[#080b12] border border-[#1e2638]">
          <div>
            <span className="text-zinc-500 block text-[11px]">Primary Language:</span>
            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold border ${getLanguageColor(repo.language)}`}>
              {repo.language}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Health Score:</span>
            <span className={`font-bold font-mono text-sm ${getHealthScoreColor(repo.healthScore)}`}>
              {repo.healthScore}/100
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Open PRs:</span>
            <span className="font-semibold text-blue-400">{repo.openPRs} active</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Vulnerabilities:</span>
            <span className={`font-semibold ${repo.vulnerabilityCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {repo.vulnerabilityCount} issues
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[#1e2638] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetails(repo)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#141b2b] hover:bg-[#1d273e] border border-[#1e2638] text-xs font-medium text-zinc-200 transition-colors"
          >
            <span>Details</span>
            <ExternalLinkIcon className="w-3 h-3 text-zinc-400" />
          </button>
          <button
            onClick={() => onSyncRepo(repo.id, repo.fullName)}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Sync
          </button>
        </div>

        <button
          onClick={handleScanCode}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-all"
        >
          <ShieldIcon className="w-3.5 h-3.5" />
          <span>Scan Code</span>
        </button>
      </div>
    </div>
  );
}
