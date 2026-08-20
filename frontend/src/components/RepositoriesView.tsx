'use client';

import React, { useState } from 'react';
import { RepositoryItem } from '../types/dashboard';
import { RepoIcon, GitHubIcon, PlusIcon, SearchIcon, CloseIcon } from './Icons';

const initialRepos: RepositoryItem[] = [
  {
    id: 'repo-1',
    name: 'CodeSentinel',
    fullName: 'aannmaryanto/CodeSentinel',
    defaultBranch: 'main',
    isPrivate: true,
    lastScan: '10 mins ago',
    openPRs: 2,
    healthScore: 98,
    status: 'active',
  },
  {
    id: 'repo-2',
    name: 'codesentinel-api',
    fullName: 'aannmaryanto/codesentinel-api',
    defaultBranch: 'main',
    isPrivate: true,
    lastScan: '2 hours ago',
    openPRs: 4,
    healthScore: 84,
    status: 'active',
  },
  {
    id: 'repo-3',
    name: 'web-dashboard',
    fullName: 'aannmaryanto/web-dashboard',
    defaultBranch: 'main',
    isPrivate: false,
    lastScan: '1 day ago',
    openPRs: 1,
    healthScore: 92,
    status: 'active',
  },
];

interface RepositoriesViewProps {
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export function RepositoriesView({ onShowToast }: RepositoriesViewProps) {
  const [repos, setRepos] = useState<RepositoryItem[]>(initialRepos);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');

  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnectRepo = () => {
    if (!newRepoName.trim()) return;

    const newRepo: RepositoryItem = {
      id: `repo-${Date.now()}`,
      name: newRepoName.split('/')[1] || newRepoName,
      fullName: newRepoName.includes('/') ? newRepoName : `aannmaryanto/${newRepoName}`,
      defaultBranch: 'main',
      isPrivate: true,
      lastScan: 'Just now',
      openPRs: 0,
      healthScore: 100,
      status: 'active',
    };

    setRepos([newRepo, ...repos]);
    setShowConnectModal(false);
    setNewRepoName('');
    onShowToast(`Connected repository ${newRepo.fullName} to CodeSentinel`, 'success');
  };

  const handleSyncRepo = (repoName: string) => {
    onShowToast(`Initiated manual sync for ${repoName}`, 'info');
  };

  return (
    <div className="space-[#1e2638] space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f1420] border border-[#1e2638] p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <RepoIcon className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Connected Repositories</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Repositories connected via GitHub App installation with automated webhook triggers
          </p>
        </div>

        <button
          onClick={() => setShowConnectModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Connect Repository</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connected repositories..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0f1420] border border-[#1e2638] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <span className="text-xs font-mono text-zinc-400">{filteredRepos.length} Repositories</span>
      </div>

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRepos.map((repo) => (
          <div
            key={repo.id}
            className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 space-y-4 hover:border-[#2b3752] transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <GitHubIcon className="w-5 h-5 text-zinc-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">{repo.name}</h3>
                  <p className="text-xs text-zinc-400 font-mono">{repo.fullName}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {repo.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg bg-[#121826] border border-[#1e2638]">
              <div>
                <span className="text-zinc-500 block">Default Branch:</span>
                <span className="font-mono text-zinc-200">{repo.defaultBranch}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Open PRs:</span>
                <span className="font-semibold text-blue-400">{repo.openPRs} PRs</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Health Score:</span>
                <span className="font-bold text-emerald-400">{repo.healthScore}/100</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Last Scan:</span>
                <span className="font-mono text-zinc-400">{repo.lastScan}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1e2638]">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active Sync
              </span>
              <button
                onClick={() => handleSyncRepo(repo.fullName)}
                className="text-xs text-zinc-400 hover:text-white font-medium"
              >
                Sync Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0f1420] border border-[#1e2638] rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
              <h3 className="text-sm font-semibold text-white">Connect GitHub Repository</h3>
              <button onClick={() => setShowConnectModal(false)} className="text-zinc-400 hover:text-white">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <label htmlFor="repo-name-input" className="block text-zinc-400">
                Repository Full Name (owner/repo):
              </label>
              <input
                id="repo-name-input"
                type="text"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="e.g. aannmaryanto/my-secure-service"
                className="w-full rounded-lg bg-[#121826] border border-[#1e2638] p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#1e2638] pt-4">
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#121826] text-zinc-300 text-xs hover:bg-[#1a2336]"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectRepo}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
