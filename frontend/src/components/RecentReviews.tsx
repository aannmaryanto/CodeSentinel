'use client';

import React from 'react';
import { ReviewItem } from '../types/dashboard';
import { CheckCircleIcon, AlertTriangleIcon, GitHubIcon } from './Icons';

const recentReviews: ReviewItem[] = [
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
  },
];

export function RecentReviews() {
  return (
    <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] overflow-hidden">
      <div className="p-5 border-b border-[#1e2638] flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Recent Pull Request Reviews</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Automated code reviews performed across active branches</p>
        </div>
        <span className="text-xs font-mono text-zinc-400 bg-[#161d2d] px-2.5 py-1 rounded border border-[#1e2638]">
          5 Total
        </span>
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
            {recentReviews.map((review) => {
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
                <tr key={review.id} className="hover:bg-[#151c2c] transition-colors">
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
