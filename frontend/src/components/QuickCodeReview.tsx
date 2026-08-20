'use client';

import React, { useState } from 'react';
import { SupportedLanguage, ReviewResult } from '../types/dashboard';
import { analyzeCode, defaultCodeSnippets } from '../services/reviewService';
import {
  CodeIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CopyIcon,
  CheckIcon,
  RefreshIcon,
  TrashIcon,
} from './Icons';

interface QuickCodeReviewProps {
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export function QuickCodeReview({ onShowToast }: QuickCodeReviewProps) {
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [code, setCode] = useState<string>(defaultCodeSnippets.typescript);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as SupportedLanguage;
    setLanguage(lang);
    setCode(defaultCodeSnippets[lang] || '');
    setReviewResult(null);
    setErrorState(null);
  };

  const handleResetSample = () => {
    setCode(defaultCodeSnippets[language] || '');
    setReviewResult(null);
    setErrorState(null);
    onShowToast(`Reset to default ${getLanguageLabel(language)} code sample`, 'info');
  };

  const handleClearCode = () => {
    setCode('');
    setReviewResult(null);
    setErrorState(null);
  };

  const handleAnalyze = async () => {
    if (!code.trim()) {
      onShowToast('Please paste or type code before submitting for review', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setErrorState(null);
    setReviewResult(null);
    setAnalysisStep('Building AST representation & parsing diff hunks...');

    try {
      setTimeout(() => {
        setAnalysisStep('Executing Semgrep static security rules...');
      }, 150);

      setTimeout(() => {
        setAnalysisStep('Querying Gemini AI review engine & normalizing findings...');
      }, 300);

      const result = await analyzeCode({ code, language });
      setReviewResult(result);
      setIsAnalyzing(false);

      if (result.summary.totalIssues > 0) {
        onShowToast(
          `Review Complete: Score ${result.summary.overallScore}/100 with ${result.summary.totalIssues} issue(s)`,
          'warning'
        );
      } else {
        onShowToast(`Review Complete: Clean code with Score 100/100!`, 'success');
      }
    } catch {
      setIsAnalyzing(false);
      setErrorState('Failed to process code review. Please check your syntax and try again.');
      onShowToast('Code review analysis failed', 'warning');
    }
  };

  const handleCopyFix = (fixText: string, id: string) => {
    navigator.clipboard.writeText(fixText);
    setCopiedId(id);
    onShowToast('Suggested fix copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="quick-review-section" className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CodeIcon className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-white">AI Code Review Sandbox</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Submit code snippets across 6 supported programming languages for real-time security reviews
          </p>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="language-select" className="text-xs text-zinc-400 font-medium whitespace-nowrap">
            Language:
          </label>
          <select
            id="language-select"
            value={language}
            onChange={handleLanguageChange}
            className="rounded-lg bg-[#121826] border border-[#1e2638] px-3 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
          </select>
        </div>
      </div>

      {/* Code Textarea & Buffer Actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Code Editor Buffer ({getLanguageLabel(language)})</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSample}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-blue-400 transition-colors"
            >
              <RefreshIcon className="w-3 h-3" /> Load Sample
            </button>
            <span>•</span>
            <button
              onClick={handleClearCode}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-400 transition-colors"
            >
              <TrashIcon className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>

        <textarea
          id="code-textarea"
          rows={7}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setErrorState(null);
          }}
          placeholder={`Paste ${getLanguageLabel(language)} code snippet here for automated security review...`}
          className="w-full rounded-lg bg-[#080b12] border border-[#1e2638] p-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors resize-y leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-mono">
          {code.split('\n').filter(Boolean).length} lines • {code.length} chars
        </span>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !code.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-blue-900/20 transition-all active:scale-95"
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <ShieldIcon className="w-4 h-4" />
              <span>Submit Code for Review</span>
            </>
          )}
        </button>
      </div>

      {/* Loading Progress State */}
      {isAnalyzing && (
        <div className="rounded-lg bg-[#121826] border border-blue-500/30 p-4 space-y-2 animate-pulse">
          <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
            <ShieldIcon className="w-4 h-4" />
            <span>{analysisStep}</span>
          </div>
          <div className="w-full bg-[#080b12] rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-full w-3/4 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* Error State */}
      {errorState && (
        <div className="rounded-lg bg-red-950/40 border border-red-500/30 p-4 flex items-center gap-3 text-xs text-red-300">
          <AlertTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{errorState}</span>
        </div>
      )}

      {/* Structured Review Results & Summary */}
      {reviewResult && !isAnalyzing && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Summary Header Cards */}
          <div className="rounded-lg bg-[#121826] border border-[#1e2638] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Review Results Summary</h3>
                  <p className="text-xs text-zinc-400 font-mono">Analyzed at {reviewResult.analyzedAt}</p>
                </div>
              </div>

              {/* Overall Score Badge */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#080b12] border border-[#1e2638]">
                <span className="text-xs text-zinc-400">Security Score:</span>
                <span
                  className={`text-base font-bold font-mono ${
                    reviewResult.summary.overallScore >= 80
                      ? 'text-emerald-400'
                      : reviewResult.summary.overallScore >= 50
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {reviewResult.summary.overallScore}/100
                </span>
              </div>
            </div>

            {/* Metric Summary Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded bg-[#080b12] border border-[#1e2638] space-y-1">
                <span className="text-zinc-500 block">Critical Issues</span>
                <span className="font-bold text-red-400 text-sm">{reviewResult.summary.criticalCount}</span>
              </div>
              <div className="p-2.5 rounded bg-[#080b12] border border-[#1e2638] space-y-1">
                <span className="text-zinc-500 block">High Issues</span>
                <span className="font-bold text-orange-400 text-sm">{reviewResult.summary.highCount}</span>
              </div>
              <div className="p-2.5 rounded bg-[#080b12] border border-[#1e2638] space-y-1">
                <span className="text-zinc-500 block">Medium Issues</span>
                <span className="font-bold text-amber-400 text-sm">{reviewResult.summary.mediumCount}</span>
              </div>
              <div className="p-2.5 rounded bg-[#080b12] border border-[#1e2638] space-y-1">
                <span className="text-zinc-500 block">Low / Info</span>
                <span className="font-bold text-blue-400 text-sm">{reviewResult.summary.lowCount}</span>
              </div>
            </div>
          </div>

          {/* Detailed Structured Findings List */}
          {reviewResult.findings.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Detailed Security Findings ({reviewResult.findings.length})
              </h4>

              {reviewResult.findings.map((item) => (
                <div key={item.id} className="p-4 rounded-lg bg-[#121826] border border-[#1e2638] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${
                          item.severity === 'critical'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : item.severity === 'high'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-xs font-semibold text-white">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-[#080b12] px-2 py-0.5 rounded border border-[#1e2638]">
                      <span>{item.file}</span>
                      <span className="text-blue-400">:L{item.line}</span>
                    </div>
                  </div>

                  {/* Explanation / Impact */}
                  <div>
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                      Explanation & Impact:
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed bg-[#080b12] p-2.5 rounded border border-[#1e2638]">
                      {item.impact}
                    </p>
                  </div>

                  {/* Evidence Code */}
                  <div className="p-2.5 rounded bg-[#080b12] border border-[#1e2638] font-mono text-xs text-red-300">
                    <span className="text-[10px] uppercase text-zinc-500 block mb-1">Evidence Code Line:</span>
                    <code>{item.evidence}</code>
                  </div>

                  {/* Suggested Fix */}
                  {item.suggestedFix && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                          Suggested Fix:
                        </span>
                        <button
                          onClick={() => handleCopyFix(item.suggestedFix || '', item.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                        >
                          {copiedId === item.id ? (
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <CopyIcon className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === item.id ? 'Copied Fix!' : 'Copy Fix'}</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded bg-[#05070d] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto">
                        {item.suggestedFix}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-[#121826] border border-emerald-500/30 p-6 text-center space-y-2">
              <CheckCircleIcon className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-semibold text-white">Zero Vulnerabilities Detected</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No credential leaks, injection vectors, or dangerous code executions found in this snippet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getLanguageLabel(lang: SupportedLanguage): string {
  switch (lang) {
    case 'typescript':
      return 'TypeScript';
    case 'javascript':
      return 'JavaScript';
    case 'python':
      return 'Python';
    case 'java':
      return 'Java';
    case 'cpp':
      return 'C++';
    case 'go':
      return 'Go';
  }
}
