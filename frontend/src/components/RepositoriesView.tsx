'use client';

import React, { useState, useEffect } from 'react';
import { RepositoryItem } from '../types/dashboard';
import { repositoryService } from '../services/repositoryService';
import { RepoIcon, GitHubIcon, PlusIcon, SearchIcon, CloseIcon, ShieldIcon } from './Icons';

interface RepositoriesViewProps {
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export function RepositoriesView({ onShowToast }: RepositoriesViewProps) {
  const [repos, setRepos] = useState<RepositoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');

  const refreshRepositories = async () => {
    setIsLoading(true);
    setErrorState(null);
    try {
      const data = await repositoryService.getRepositories();
      setRepos(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load repositories.';
      setErrorState(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    repositoryService
      .getRepositories()
      .then((data) => {
        if (isMounted) {
          setRepos(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load repositories.';
          setErrorState(msg);
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnectRepo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log('[RepositoriesView.handleConnectRepo] Triggered with input:', newRepoName);
    if (!newRepoName.trim()) {
      console.warn('[RepositoriesView.handleConnectRepo] Empty input, returning early');
      return;
    }

    setIsConnecting(true);
    try {
      console.log('[RepositoriesView.handleConnectRepo] Submitting:', newRepoName.trim());
      const created = await repositoryService.connectRepository(newRepoName.trim());
      console.log('[RepositoriesView.handleConnectRepo] Success:', created);
      setShowConnectModal(false);
      setNewRepoName('');
      onShowToast(`Connected repository ${created.fullName} to CodeSentinel`, 'success');
      await refreshRepositories();
    } catch (err: unknown) {
      console.error('[RepositoriesView.handleConnectRepo] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to connect repository.';
      onShowToast(msg, 'warning');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncRepo = async (repoId: string, repoFullName: string) => {
    setSyncingRepoId(repoId);
    try {
      const updated = await repositoryService.syncRepository(repoId);
      onShowToast(`Manual sync completed for ${repoFullName}`, 'info');
      setRepos((prev) => prev.map((r) => (r.id === repoId ? updated : r)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to sync ${repoFullName}`;
      onShowToast(msg, 'warning');
    } finally {
      setSyncingRepoId(null);
    }
  };

  const handleScanRepo = async (repoId: string, repoFullName: string) => {
    try {
      const scanResult = await repositoryService.scanRepository(repoId);
      const totalFindings = scanResult.total_findings;
      const penalty = scanResult.severity_counts
        ? scanResult.severity_counts.critical * 25 +
          scanResult.severity_counts.high * 15 +
          scanResult.severity_counts.medium * 10 +
          scanResult.severity_counts.low * 5 +
          scanResult.severity_counts.info * 1
        : totalFindings * 10;
      const healthScore = totalFindings === 0 ? 100 : Math.max(0, 100 - penalty);

      const latestScanData = {
        id: scanResult.id,
        status: scanResult.status,
        totalFindings: scanResult.total_findings,
        severityCounts: scanResult.severity_counts,
        findings: scanResult.findings.map((f) => ({
          id: f.id,
          rule_id: f.rule_id,
          title: f.title,
          description: f.description,
          severity: f.severity,
          category: f.category,
          file_path: f.file_path,
          line_number: f.line_number,
          code_snippet: f.code_snippet,
          recommendation: f.recommendation,
        })),
      };

      setRepos((prev) =>
        prev.map((r) =>
          r.id === repoId
            ? {
                ...r,
                vulnerabilityCount: totalFindings,
                healthScore: healthScore,
                lastScan: 'Just now',
                latestScan: latestScanData,
              }
            : r
        )
      );
      const msg = totalFindings === 0
        ? `Security scan completed for ${repoFullName}: Clean!`
        : `Security scan completed for ${repoFullName}: ${totalFindings} issue(s) detected.`;
      onShowToast(msg, totalFindings === 0 ? 'success' : 'warning');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to scan ${repoFullName}`;
      onShowToast(msg, 'warning');
    }
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-all shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Connect Repository</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center justify-between gap-4">
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
        <span className="text-xs font-mono text-zinc-400">
          Showing {filteredRepos.length} of {repos.length} Repositories
        </span>
      </div>

      {/* Error State */}
      {errorState && (
        <div className="rounded-xl bg-rose-950/40 border border-rose-500/40 p-6 text-center space-y-3">
          <h3 className="text-sm font-bold text-white">Failed to Load Repositories</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">{errorState}</p>
          <button
            onClick={refreshRepositories}
            className="px-4 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/40 text-xs font-semibold text-rose-200 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && !errorState && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#121826]" />
                <div className="space-y-1 flex-1">
                  <div className="h-4 bg-[#121826] rounded w-3/4" />
                  <div className="h-3 bg-[#121826] rounded w-1/2" />
                </div>
              </div>
              <div className="h-16 bg-[#121826] rounded-lg" />
              <div className="h-6 bg-[#121826] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Repositories Grid */}
      {!isLoading && !errorState && filteredRepos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 space-y-4 hover:border-[#2b3752] transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GitHubIcon className="w-5 h-5 text-zinc-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{repo.name}</h3>
                      <p className="text-xs text-zinc-400 font-mono truncate max-w-[180px]">{repo.fullName}</p>
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
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1e2638]">
                <button
                  onClick={() => handleSyncRepo(repo.id, repo.fullName)}
                  disabled={syncingRepoId === repo.id}
                  className="text-xs text-zinc-400 hover:text-white font-medium disabled:opacity-50 transition-colors"
                >
                  {syncingRepoId === repo.id ? 'Syncing...' : 'Sync Now'}
                </button>

                <button
                  onClick={() => handleScanRepo(repo.id, repo.fullName)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-all"
                >
                  <ShieldIcon className="w-3.5 h-3.5" />
                  <span>Scan Code</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorState && repos.length === 0 && (
        <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400">
            <RepoIcon className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-base font-bold text-white">No Connected Repositories</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            You have not connected any GitHub repositories yet. Connect your first repository to enable automated security reviews.
          </p>
          <button
            onClick={() => setShowConnectModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Connect Your First Repository</span>
          </button>
        </div>
      )}

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0f1420] border border-[#1e2638] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
              <h3 className="text-sm font-semibold text-white">Connect GitHub Repository</h3>
              <button
                onClick={() => setShowConnectModal(false)}
                disabled={isConnecting}
                className="text-zinc-400 hover:text-white disabled:opacity-50"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectRepo} className="space-y-4">
              <div className="space-y-2 text-xs text-zinc-300">
                <label htmlFor="repo-name-input" className="block text-zinc-400 font-medium">
                  Repository Full Name (owner/repo):
                </label>
                <input
                  id="repo-name-input"
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="e.g. aannmaryanto/my-secure-service"
                  disabled={isConnecting}
                  required
                  className="w-full rounded-lg bg-[#121826] border border-[#1e2638] p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#1e2638] pt-4">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  disabled={isConnecting}
                  className="px-3 py-1.5 rounded-lg bg-[#121826] text-zinc-300 text-xs hover:bg-[#1a2336] disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnecting || !newRepoName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50 transition-all"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
