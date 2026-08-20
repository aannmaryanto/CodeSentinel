'use client';

import React, { useState } from 'react';
import { SettingsIcon, ShieldIcon, CheckCircleIcon } from './Icons';

interface SettingsViewProps {
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export function SettingsView({ onShowToast }: SettingsViewProps) {
  const [aiModel, setAiModel] = useState('gemini-1.5-flash');
  const [semgrepRules, setSemgrepRules] = useState(true);
  const [prCommentsEnabled, setPrCommentsEnabled] = useState(true);
  const [severityThreshold, setSeverityThreshold] = useState('high');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onShowToast('Security and engine settings updated successfully!', 'success');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 bg-[#0f1420] border border-[#1e2638] p-5 rounded-xl">
        <SettingsIcon className="w-6 h-6 text-blue-400" />
        <div>
          <h2 className="text-lg font-bold text-white">Platform Settings & Security Engine Config</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure Gemini AI review parameters, static analysis rulesets, and GitHub feedback sync
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* AI Engine Selection */}
        <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1e2638] pb-3">
            <ShieldIcon className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Gemini AI Model Selection</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label
              onClick={() => setAiModel('gemini-1.5-flash')}
              className={`p-4 rounded-xl border cursor-pointer transition-colors space-y-2 ${
                aiModel === 'gemini-1.5-flash'
                  ? 'bg-blue-600/10 border-blue-500 text-white'
                  : 'bg-[#121826] border-[#1e2638] text-zinc-400 hover:border-[#2b3752]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Gemini 1.5 Flash</span>
                {aiModel === 'gemini-1.5-flash' && <CheckCircleIcon className="w-4 h-4 text-blue-400" />}
              </div>
              <p className="text-xs text-zinc-400">
                Ultra-fast review pass (3-5s response time). Recommended for standard PR diffs.
              </p>
            </label>

            <label
              onClick={() => setAiModel('gemini-1.5-pro')}
              className={`p-4 rounded-xl border cursor-pointer transition-colors space-y-2 ${
                aiModel === 'gemini-1.5-pro'
                  ? 'bg-blue-600/10 border-blue-500 text-white'
                  : 'bg-[#121826] border-[#1e2638] text-zinc-400 hover:border-[#2b3752]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Gemini 1.5 Pro</span>
                {aiModel === 'gemini-1.5-pro' && <CheckCircleIcon className="w-4 h-4 text-blue-400" />}
              </div>
              <p className="text-xs text-zinc-400">
                Deep reasoning pass over large codebase AST contexts. Higher accuracy on complex logic errors.
              </p>
            </label>
          </div>
        </div>

        {/* Static Analysis Config */}
        <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white border-b border-[#1e2638] pb-3">
            Static Rulesets & GitHub Feedback
          </h3>

          <div className="space-y-4 text-xs text-zinc-300">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Semgrep Security Rulesets</span>
                <p className="text-zinc-400 text-[11px]">
                  Run OWASP Top 10 & security-audit static analyzers inside worker containers
                </p>
              </div>
              <input
                type="checkbox"
                checked={semgrepRules}
                onChange={(e) => setSemgrepRules(e.target.checked)}
                className="w-4 h-4 rounded bg-[#121826] border-[#1e2638] text-blue-600 focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-between border-t border-[#1e2638] pt-4">
              <div>
                <span className="font-semibold text-white">Post Comments to GitHub PRs</span>
                <p className="text-zinc-400 text-[11px]">
                  Automatically post inline finding suggestions on pull request diff lines
                </p>
              </div>
              <input
                type="checkbox"
                checked={prCommentsEnabled}
                onChange={(e) => setPrCommentsEnabled(e.target.checked)}
                className="w-4 h-4 rounded bg-[#121826] border-[#1e2638] text-blue-600 focus:ring-0"
              />
            </div>

            <div className="border-t border-[#1e2638] pt-4">
              <label htmlFor="severity-threshold-select" className="block font-semibold text-white mb-1">
                Minimum Severity Threshold for PR Block
              </label>
              <select
                id="severity-threshold-select"
                value={severityThreshold}
                onChange={(e) => setSeverityThreshold(e.target.value)}
                className="w-full max-w-xs rounded-lg bg-[#121826] border border-[#1e2638] p-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              >
                <option value="critical">Critical Only</option>
                <option value="high">Critical & High</option>
                <option value="medium">Critical, High & Medium</option>
                <option value="none">Do Not Block PRs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition-all"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
