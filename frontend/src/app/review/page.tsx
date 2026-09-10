'use client';

import React, { useState } from 'react';
import { SupportedLanguage, ReviewResult, ToastNotification, NavTab } from '@/types/dashboard';
import { analyzeCode, defaultCodeSnippets } from '@/services/reviewService';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ReviewEditor } from '@/components/review/ReviewEditor';
import { ReviewResults } from '@/components/review/ReviewResults';
import { EmptyReviewState } from '@/components/review/EmptyReviewState';
import { CheckCircleIcon, AlertTriangleIcon, CloseIcon } from '@/components/Icons';

export default function ReviewPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('reviews');
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [code, setCode] = useState<string>(defaultCodeSnippets.typescript);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}`;
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3500);
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setCode(defaultCodeSnippets[lang] || '');
    setReviewResult(null);
    setErrorState(null);
    showToast(`Switched language to ${lang.toUpperCase()}`, 'info');
  };

  const handleLoadSample = () => {
    setCode(defaultCodeSnippets[language] || '');
    setReviewResult(null);
    setErrorState(null);
    showToast(`Loaded ${language.toUpperCase()} security sample`, 'info');
  };

  const handleClearCode = () => {
    setCode('');
    setReviewResult(null);
    setErrorState(null);
  };

  const handleSubmitReview = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setErrorState('Code submission cannot be empty. Please enter or load a code sample.');
      showToast('Empty code submission', 'warning');
      return;
    }

    if (trimmedCode.length > 50000) {
      setErrorState('Code submission exceeds maximum limit of 50,000 characters.');
      showToast('Code submission size too large', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setErrorState(null);
    setReviewResult(null);
    setAnalysisStep('Initializing AST parsing & diff hunk inspection...');

    try {
      setTimeout(() => {
        setAnalysisStep('Executing static security analysis rule suite...');
      }, 200);

      setTimeout(() => {
        setAnalysisStep('Querying Gemini AI review engine & normalizing findings...');
      }, 500);

      const result = await analyzeCode({ code: trimmedCode, language });
      setReviewResult(result);
      setIsAnalyzing(false);

      if (result.summary.totalIssues > 0) {
        showToast(
          `Review Complete: Score ${result.summary.overallScore}/100 with ${result.summary.totalIssues} finding(s)`,
          'warning'
        );
      } else {
        showToast('Review Complete: Clean code with Score 100/100!', 'success');
      }
    } catch (err: unknown) {
      setIsAnalyzing(false);
      const errMsg = err instanceof Error ? err.message : 'Failed to analyze code snippet.';
      setErrorState(errMsg);
      showToast('Code review analysis failed', 'warning');
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
          activeTab="reviews"
          onShowToast={showToast}
        />

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl w-full mx-auto">
          {/* Top Banner */}
          <div className="space-y-1 border-b border-[#1e2638] pb-4">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Code Security Analysis Workbench
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Submit code snippets across 6 supported languages for instant AI-powered static security code reviews
            </p>
          </div>

          {/* Error Banner */}
          {errorState && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs font-medium animate-in fade-in duration-200">
              <AlertTriangleIcon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-bold block">Review Analysis Error</span>
                <span>{errorState}</span>
              </div>
            </div>
          )}

          {/* Code Editor */}
          <ReviewEditor
            language={language}
            code={code}
            isAnalyzing={isAnalyzing}
            analysisStep={analysisStep}
            onLanguageChange={handleLanguageChange}
            onCodeChange={(newCode) => {
              setCode(newCode);
              if (errorState) setErrorState(null);
            }}
            onLoadSample={handleLoadSample}
            onClearCode={handleClearCode}
            onSubmitReview={handleSubmitReview}
          />

          {/* Results or Empty State */}
          {reviewResult ? (
            <ReviewResults result={reviewResult} onShowToast={showToast} />
          ) : (
            !isAnalyzing && <EmptyReviewState onLoadSample={handleLoadSample} />
          )}
        </main>

        {/* Toast Banner */}
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
                aria-label="Close notification"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-[#1e2638] py-4 px-6 text-center text-xs text-zinc-500 mt-auto">
          CodeSentinel Platform • AI & Static Security Review Workbench
        </footer>
      </div>
    </div>
  );
}
