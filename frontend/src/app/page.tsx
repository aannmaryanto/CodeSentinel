'use client';

import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { DashboardHero } from '../components/DashboardHero';
import { MetricCards } from '../components/MetricCards';
import { RecentReviews } from '../components/RecentReviews';
import { LatestFindings } from '../components/LatestFindings';
import { QuickCodeReview } from '../components/QuickCodeReview';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNewReviewClick = () => {
    const section = document.getElementById('quick-review-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#080b12] text-zinc-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Header */}
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Hero Banner */}
          <DashboardHero onNewReviewClick={handleNewReviewClick} />

          {/* Metric Overview Cards */}
          <MetricCards />

          {/* Grid Layout for Reviews and Findings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <RecentReviews />
              <QuickCodeReview />
            </div>
            <div className="lg:col-span-1">
              <LatestFindings />
            </div>
          </div>
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-[#1e2638] py-4 px-6 text-center text-xs text-zinc-500 mt-auto">
          CodeSentinel Platform • Phase 4B Dashboard Scaffolding • Secured with AI & Semgrep Static Engine
        </footer>
      </div>
    </div>
  );
}
