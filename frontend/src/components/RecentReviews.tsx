'use client';

import React, { useState } from 'react';
import { ReviewItem, ReviewStatus } from '../types/dashboard';
import { CheckCircleIcon, AlertTriangleIcon, GitHubIcon, SearchIcon, CloseIcon } from './Icons';

const initialReviews: ReviewItem[] = [
  {
    id: 'rev-1',
    repository: 'codesentinel-api',
    prNumber: 142,
    title: 'Add JWT authentication',
    author: 'aannmaryanto',
    status: 'critical',
    issueCount: 3,
    timestamp: '12 mins ago',
    commitSha: '7154f23',
    description: 'Implements JWT token auth handler and security session refresh middleware.',
  },
  {
    id: 'rev-2',
    repository: 'web-dashboard',
    prNumber: 89,
    title: 'Refactor user settings',
    author: 'dev-team',
    status: 'warnings',
    issueCount: 5,
    timestamp: '2 hours ago',
    commitSha: '909d894',
    description: 'Refactors profile preference components and org membership settings.',
  },
  {
    id: 'rev-3',
    repository: 'codesentinel-api',
    prNumber: 138,
    title: 'Update dependencies',
    author: 'dependabot',
    status: 'passed',
    issueCount: 0,
    timestamp: '5 hours ago',
    commitSha: 'ba2854a',
    description: 'Automated dependency updates for security security audit security fixes.',
  },
  {
    id: 'rev-4',
    repository: 'auth-service',
    prNumber: 56,
    title: 'Implement OAuth callback validation',
    author: 'sec-ops',
    status: 'passed',
    issueCount: 0,
    timestamp: '1 day ago',
    commitSha: '4f1222a',
    description: 'Adds state token verification during GitHub OAuth code exchange.',
  },
  {
    id: 'rev-5',
    repository: 'payment-worker',
    prNumber: 201,
    title: 'Fix concurrency race in Celery queue',
    author: 'backend-lead',
    status: 'critical',
    issueCount: 2,
    timestamp: '2 days ago',
    commitSha: 'c891ab0',
    description: 'Introduces Redis distributed locking to prevent duplicate review task triggers.',
  },
];

interface RecentReviewsProps {
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export function RecentReviews({ onShowToast }: RecentReviewsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);

  const filteredReviews = initialReviews.filter((item) => {
    const matchesSearch =
      item.repository.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (item: ReviewItem) => {
    setSelectedReview(item);
  };

  const handleTriggerRescan = (item: ReviewItem) => {
    if (onShowToast) {
      onShowToast(`Re-triggered AI code review scan for ${item.repository} #${item.prNumber}`, 'info');
    }
    setSelectedReview(null);
  };

  return (
    <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] overflow-hidden">
      <div className="p-5 border-b border-[#1e2638] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Recent Pull Request Reviews</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Automated code reviews performed across active branches</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repo or PR..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[#121826] border border-[#1e2638] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-36 sm:w-44 transition-colors"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 bg-[#121826] p-1 rounded-lg border border-[#1e2638]">
            {(['all', 'critical', 'warnings', 'passed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="bg-[#121826] text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-[#1e2638]">
            <tr>
              <th className="py-3 px-4">Repository & PR</th>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Issues</th>
              <th className="py-3 px-4 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2638]">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review) => {
                let statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> Passed
                  </span>
                );

                if (review.status === 'critical') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      <AlertTriangleIcon className="w-3.5 h-3.5" /> Critical issues
                    </span>
                  );
                } else if (review.status === 'warnings') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <AlertTriangleIcon className="w-3.5 h-3.5" /> Warnings
                    </span>
                  );
                }

                return (
                  <tr
                    key={review.id}
                    onClick={() => handleRowClick(review)}
                    className="hover:bg-[#151c2c] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <GitHubIcon className="w-4 h-4 text-zinc-400" />
                        <span className="font-medium text-white">{review.repository}</span>
                        <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          #{review.prNumber}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-zinc-200 truncate max-w-xs">{review.title}</div>
                      <div className="text-xs text-zinc-500 font-mono">commit {review.commitSha} by {review.author}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{statusBadge}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-zinc-300">
                        {review.issueCount === 0 ? '0 issues' : `${review.issueCount} issues detected`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right text-xs text-zinc-400 font-mono">
                      {review.timestamp}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs">
                  No matching pull request reviews found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review Details Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0f1420] border border-[#1e2638] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
              <div className="flex items-center gap-2">
                <GitHubIcon className="w-5 h-5 text-white" />
                <h3 className="text-base font-semibold text-white">
                  {selectedReview.repository} #{selectedReview.prNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-md"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div>
                <span className="text-zinc-500">PR Title:</span>
                <p className="text-sm font-semibold text-white mt-0.5">{selectedReview.title}</p>
              </div>

              {selectedReview.description && (
                <div>
                  <span className="text-zinc-500">Description:</span>
                  <p className="text-zinc-400 mt-0.5">{selectedReview.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#121826] border border-[#1e2638]">
                <div>
                  <span className="text-zinc-500">Author:</span>
                  <p className="font-mono text-zinc-200">{selectedReview.author}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Commit SHA:</span>
                  <p className="font-mono text-blue-400">{selectedReview.commitSha}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Status:</span>
                  <p className="capitalize font-semibold text-white">{selectedReview.status}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Findings:</span>
                  <p className="font-semibold text-zinc-200">{selectedReview.issueCount} total</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#1e2638] pt-4">
              <button
                onClick={() => setSelectedReview(null)}
                className="px-4 py-2 rounded-lg bg-[#121826] hover:bg-[#1a2336] text-zinc-300 text-xs font-medium border border-[#1e2638]"
              >
                Close
              </button>
              <button
                onClick={() => handleTriggerRescan(selectedReview)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm"
              >
                Trigger Re-Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
