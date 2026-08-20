'use client';

import React, { useState } from 'react';
import { NavTab, ToastNotification } from '../types/dashboard';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { DashboardHero } from '../components/DashboardHero';
import { MetricCards } from '../components/MetricCards';
import { RecentReviews } from '../components/RecentReviews';
import { LatestFindings } from '../components/LatestFindings';
import { QuickCodeReview } from '../components/QuickCodeReview';
import { RepositoriesView } from '../components/RepositoriesView';
import { SettingsView } from '../components/SettingsView';
import { ReviewsView } from '../components/ReviewsView';
import { CheckCircleIcon, AlertTriangleIcon, CloseIcon } from '../components/Icons';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}`;
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3500);
  };

  const handleNewReviewClick = () => {
    setActiveTab('dashboard');
    setTimeout(() => {
      const section = document.getElementById('quick-review-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
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
        {/* Top Header */}
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          activeTab={activeTab}
          onShowToast={showToast}
        />

        {/* Dynamic Main Body based on Active Navigation Tab */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <>
              {/* Hero Banner */}
              <DashboardHero onNewReviewClick={handleNewReviewClick} />

              {/* Metric Overview Cards */}
              <MetricCards />

              {/* Grid Layout for Reviews and Findings */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <RecentReviews onShowToast={showToast} />
                  <QuickCodeReview onShowToast={showToast} />
                </div>
                <div className="lg:col-span-1">
                  <LatestFindings onShowToast={showToast} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'reviews' && (
            <ReviewsView
              onShowToast={showToast}
              onNavigateToQuickReview={handleNewReviewClick}
            />
          )}

          {activeTab === 'repos' && <RepositoriesView onShowToast={showToast} />}

          {activeTab === 'settings' && <SettingsView onShowToast={showToast} />}
        </main>

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
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Minimal Footer */}
        <footer className="border-t border-[#1e2638] py-4 px-6 text-center text-xs text-zinc-500 mt-auto">
          CodeSentinel Platform • AI & Static Analysis Security Dashboard
        </footer>
      </div>
    </div>
  );
}
