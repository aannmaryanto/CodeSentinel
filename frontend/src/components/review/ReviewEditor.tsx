'use client';

import React from 'react';
import { SupportedLanguage } from '@/types/dashboard';

import {
  CodeIcon,
  ShieldIcon,
  RefreshIcon,
  TrashIcon,
} from '../Icons';

interface ReviewEditorProps {
  language: SupportedLanguage;
  code: string;
  isAnalyzing: boolean;
  analysisStep: string;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onCodeChange: (code: string) => void;
  onLoadSample: () => void;
  onClearCode: () => void;
  onSubmitReview: () => void;
}

export function ReviewEditor({
  language,
  code,
  isAnalyzing,
  analysisStep,
  onLanguageChange,
  onCodeChange,
  onLoadSample,
  onClearCode,
  onSubmitReview,
}: ReviewEditorProps) {
  const getLanguageLabel = (lang: SupportedLanguage): string => {
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
      default:
        return lang;
    }
  };

  const lineCount = code.split('\n').filter(Boolean).length;

  return (
    <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 lg:p-6 space-y-4 shadow-lg">
      {/* Editor Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400">
            <CodeIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Source Code Input</h2>
            <p className="text-xs text-zinc-400">
              Select language and paste source code or load a sample
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="review-language-select" className="text-xs text-zinc-400 font-medium whitespace-nowrap">
            Language:
          </label>
          <select
            id="review-language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            disabled={isAnalyzing}
            className="rounded-lg bg-[#121826] border border-[#1e2638] px-3 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
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

      {/* Editor Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">
            Editor Buffer ({getLanguageLabel(language)})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onLoadSample}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              <RefreshIcon className="w-3 h-3" /> Load Sample
            </button>
            <span>•</span>
            <button
              onClick={onClearCode}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <TrashIcon className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>

        <textarea
          id="code-editor-textarea"
          rows={10}
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          disabled={isAnalyzing}
          placeholder={`Paste ${getLanguageLabel(language)} code here for security review...`}
          className="w-full rounded-xl bg-[#080b12] border border-[#1e2638] p-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors resize-y leading-relaxed disabled:opacity-60"
        />
      </div>

      {/* Actions & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs text-zinc-500 font-mono">
          {lineCount} lines • {code.length} characters
        </span>
        <button
          onClick={onSubmitReview}
          disabled={isAnalyzing || !code.trim()}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-blue-900/30 transition-all active:scale-95 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Analyzing Code...</span>
            </>
          ) : (
            <>
              <ShieldIcon className="w-4 h-4" />
              <span>Submit Code for Review</span>
            </>
          )}
        </button>
      </div>

      {/* Analyzing Progress State */}
      {isAnalyzing && (
        <div className="rounded-xl bg-[#121826] border border-blue-500/30 p-4 space-y-2 animate-pulse">
          <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
            <ShieldIcon className="w-4 h-4" />
            <span>{analysisStep || 'Executing security rules & parsing diffs...'}</span>
          </div>
          <div className="w-full bg-[#080b12] rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-full w-3/4 animate-pulse rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}
