'use client';

import React from 'react';
import { RecentReviews } from './RecentReviews';
import { ReviewIcon, PlusIcon } from './Icons';

interface ReviewsViewProps {
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  onNavigateToQuickReview: () => void;
}

export function ReviewsView({ onShowToast, onNavigateToQuickReview }: ReviewsViewProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f1420] border border-[#1e2638] p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <ReviewIcon className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Code Review Runs & Audits</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Complete log of automated static analysis and Gemini AI security reviews
          </p>
        </div>

        <button
          onClick={onNavigateToQuickReview}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Quick Review</span>
        </button>
      </div>

      {/* Main Reviews Table */}
      <RecentReviews onShowToast={onShowToast} />
    </div>
  );
}
