'use client';

import React, { useState, useEffect } from 'react';
import { RepositoryItem, ToastNotification, SupportedLanguage, NavTab } from '@/types/dashboard';
import { repositoryService } from '@/services/repositoryService';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { RepositoryCard } from '@/components/repositories/RepositoryCard';
import { RepositoryDetailsModal } from '@/components/repositories/RepositoryDetailsModal';
import { RepoIcon, PlusIcon, SearchIcon, AlertTriangleIcon, CheckCircleIcon, CloseIcon } from '@/components/Icons';

export default function RepositoriesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('repos');
  const [repositories, setRepositories] = useState<RepositoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [selectedRepo, setSelectedRepo] = useState<RepositoryItem | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [newRepoFullName, setNewRepoFullName] = useState('');
  const [newRepoLanguage, setNewRepoLanguage] = useState<SupportedLanguage>('typescript');
  const [isConnecting, setIsConnecting] = useState(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}`;
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3500);
  };

  const handleRetryRepositories = () => {
    setIsLoading(true);
    setErrorState(null);
    repositoryService
      .getRepositories()
      .then((data) => {
        setRepositories(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load repositories.';
        setErrorState(msg);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    repositoryService
      .getRepositories()
      .then((data) => {
        if (isMounted) {
          setRepositories(data);
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

  const filteredRepositories = repositories.filter((repo) => {
    const matchesSearch =
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.owner.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLanguage =
      languageFilter === 'all' || repo.language.toLowerCase() === languageFilter.toLowerCase();

    return matchesSearch && matchesLanguage;
  });

  const handleConnectRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoFullName.trim()) return;

    setIsConnecting(true);
    try {
      const created = await repositoryService.connectRepository(
        newRepoFullName,
        newRepoLanguage
      );
      setRepositories((prev) => [created, ...prev]);
      setShowConnectModal(false);
      setNewRepoFullName('');
      showToast(`Connected repository ${created.fullName} to CodeSentinel`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect repository.';
      showToast(msg, 'warning');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncRepository = async (repoId: string, repoName: string) => {
    try {
      const updated = await repositoryService.syncRepository(repoId);
      setRepositories((prev) =>
        prev.map((r) => (r.id === repoId ? updated : r))
      );
      if (selectedRepo?.id === repoId) {
        setSelectedRepo(updated);
      }
      showToast(`Manual sync completed for ${repoName}`, 'info');
    } catch {
      showToast(`Failed to sync ${repoName}`, 'warning');
    }
  };

  return (
    <div className="min-h-screen bg-[#080b12] text-zinc-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Header */}
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          activeTab="repos"
          onShowToast={showToast}
        />

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f1420] border border-[#1e2638] p-5 rounded-xl shadow-lg">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400">
                  <RepoIcon className="w-5 h-5" />
                </div>
                <h1 className="text-lg font-bold text-white tracking-tight">Repositories</h1>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Manage connected GitHub repositories, inspect code security health scores, and trigger automated security scans
              </p>
            </div>

            <button
              onClick={() => setShowConnectModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition-all active:scale-95 shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Connect Repository</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xl">
              {/* Search Input */}
              <div className="relative flex-1">
                <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories by name or owner..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0f1420] border border-[#1e2638] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Language Filter */}
              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor="repo-lang-filter" className="text-xs text-zinc-400 font-medium whitespace-nowrap">
                  Language:
                </label>
                <select
                  id="repo-lang-filter"
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="rounded-xl bg-[#0f1420] border border-[#1e2638] px-3 py-2 text-xs text-zinc-200 font-medium focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Languages</option>
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="go">Go</option>
                </select>
              </div>
            </div>

            <span className="text-xs font-mono text-zinc-400">
              Showing {filteredRepositories.length} of {repositories.length} Repositories
            </span>
          </div>

          {/* Error State */}
          {errorState && (
            <div className="rounded-xl bg-rose-950/40 border border-rose-500/40 p-6 text-center space-y-3">
              <AlertTriangleIcon className="w-8 h-8 text-rose-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Failed to Load Repositories</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">{errorState}</p>
              <button
                onClick={handleRetryRepositories}
                className="px-4 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/40 text-xs font-semibold text-rose-200 transition-colors"
              >
                Retry Loading
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !errorState && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 space-y-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#121826]" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-[#121826] rounded w-3/4" />
                      <div className="h-3 bg-[#121826] rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-20 bg-[#080b12] rounded-lg" />
                  <div className="h-8 bg-[#121826] rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Populated Grid */}
          {!isLoading && !errorState && filteredRepositories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRepositories.map((repo) => (
                <RepositoryCard
                  key={repo.id}
                  repo={repo}
                  onViewDetails={setSelectedRepo}
                  onSyncRepo={handleSyncRepository}
                />
              ))}
            </div>
          )}

          {/* No Search Results State */}
          {!isLoading && !errorState && repositories.length > 0 && filteredRepositories.length === 0 && (
            <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-8 text-center space-y-3">
              <SearchIcon className="w-8 h-8 text-zinc-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Matching Repositories Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No repositories match query &quot;{searchQuery}&quot; with language filter &quot;{languageFilter}&quot;.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLanguageFilter('all');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#121826] text-xs text-blue-400 hover:text-blue-300 border border-[#1e2638] transition-colors"
              >
                Clear Search Filters
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !errorState && repositories.length === 0 && (
            <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-10 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-900/20">
                <RepoIcon className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-base font-bold text-white">No Connected Repositories</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                You have not connected any GitHub repositories yet. Connect your first repository to enable automated security reviews and code health monitoring.
              </p>
              <button
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Connect Your First Repository</span>
              </button>
            </div>
          )}
        </main>

        {/* Details Modal */}
        <RepositoryDetailsModal
          repo={selectedRepo}
          onClose={() => setSelectedRepo(null)}
          onSyncRepo={handleSyncRepository}
        />

        {/* Connect Repository Modal */}
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f1420] border border-[#1e2638] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
                <h3 className="text-sm font-bold text-white">Connect GitHub Repository</h3>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConnectRepository} className="space-y-4">
                <div>
                  <label htmlFor="modal-repo-fullname" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Repository Name (owner/repo)
                  </label>
                  <input
                    id="modal-repo-fullname"
                    type="text"
                    value={newRepoFullName}
                    onChange={(e) => setNewRepoFullName(e.target.value)}
                    placeholder="e.g. aannmaryanto/my-security-api"
                    required
                    disabled={isConnecting}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b12] border border-[#1e2638] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="modal-repo-language" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Primary Programming Language
                  </label>
                  <select
                    id="modal-repo-language"
                    value={newRepoLanguage}
                    onChange={(e) => setNewRepoLanguage(e.target.value as SupportedLanguage)}
                    disabled={isConnecting}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b12] border border-[#1e2638] text-xs text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="go">Go</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[#1e2638] pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    disabled={isConnecting}
                    className="px-4 py-2 rounded-xl bg-[#121826] hover:bg-[#1a2336] text-zinc-300 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting || !newRepoFullName.trim()}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Repository'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast Notification Banner */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-xs font-medium ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                  : 'bg-[#121826]/95 border-blue-500/40 text-blue-200'
              }`}
            >
              {toast.type === 'success' && <CheckCircleIcon className="w-4 h-4 text-emerald-400" />}
              {toast.type === 'warning' && <AlertTriangleIcon className="w-4 h-4 text-amber-400" />}
              {toast.type === 'info' && <CheckCircleIcon className="w-4 h-4 text-blue-400" />}
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-2 text-zinc-400 hover:text-white p-0.5"
                aria-label="Close toast"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-[#1e2638] py-4 px-6 text-center text-xs text-zinc-500 mt-auto">
          CodeSentinel Platform • AI & Static Security Repository Management
        </footer>
      </div>
    </div>
  );
}
