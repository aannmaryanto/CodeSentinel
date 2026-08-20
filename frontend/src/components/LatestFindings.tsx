'use client';

import React, { useState } from 'react';
import { SecurityFinding, Severity, DismissReason } from '../types/dashboard';
import { CodeIcon, CheckCircleIcon, CloseIcon } from './Icons';

const initialFindings: SecurityFinding[] = [
  {
    id: 'find-1',
    severity: 'critical',
    title: 'Hardcoded JWT secret key detected in source code',
    file: 'src/auth/token.ts',
    line: 42,
    category: 'Security / Credentials',
    confidence: 'confirmed',
    impact: 'Exposes session tokens to forgery if source code is leaked or committed to public VCS.',
    evidence: 'const JWT_SECRET = "super-secret-key-change-in-production";',
    suggestedFix: 'const JWT_SECRET = process.env.JWT_SECRET;',
    status: 'open',
  },
  {
    id: 'find-2',
    severity: 'high',
    title: 'SQL query constructed directly from unvalidated user input',
    file: 'src/db/users.ts',
    line: 87,
    category: 'Security / Injection',
    confidence: 'confirmed',
    impact: 'Allows malicious SQL injection queries to bypass authentication and alter database records.',
    evidence: 'const query = `SELECT * FROM users WHERE email = \'${req.body.email}\'`;',
    suggestedFix: 'const query = "SELECT * FROM users WHERE email = $1";',
    status: 'open',
  },
  {
    id: 'find-3',
    severity: 'medium',
    title: 'Missing input validation on public profile payload',
    file: 'src/api/profile.ts',
    line: 24,
    category: 'Data Validation',
    confidence: 'likely',
    impact: 'May allow unhandled type exceptions or XSS payload persistence in DB string columns.',
    evidence: 'const { username, bio } = req.body; await updateProfile(username, bio);',
    suggestedFix: 'const payload = ProfileSchema.parse(req.body);',
    status: 'open',
  },
];

interface LatestFindingsProps {
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export function LatestFindings({ onShowToast }: LatestFindingsProps) {
  const [findingsList, setFindingsList] = useState<SecurityFinding[]>(initialFindings);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [dismissingFinding, setDismissingFinding] = useState<SecurityFinding | null>(null);
  const [selectedReason, setSelectedReason] = useState<DismissReason>('false_positive');

  const activeFindings = findingsList.filter((f) => f.status !== 'dismissed');

  const filteredFindings = activeFindings.filter((item) => {
    if (severityFilter === 'all') return true;
    return item.severity === severityFilter;
  });

  const handleConfirmDismiss = () => {
    if (!dismissingFinding) return;

    setFindingsList((prev) =>
      prev.map((item) =>
        item.id === dismissingFinding.id
          ? { ...item, status: 'dismissed', dismissReason: selectedReason }
          : item
      )
    );

    if (onShowToast) {
      onShowToast(`Finding dismissed as ${selectedReason.replace('_', ' ')}`, 'info');
    }

    setDismissingFinding(null);
  };

  return (
    <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Latest Security Findings</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Vulnerabilities flagged across recent scans</p>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1 bg-[#121826] p-1 rounded-lg border border-[#1e2638]">
          {(['all', 'critical', 'high', 'medium'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                severityFilter === sev
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredFindings.length > 0 ? (
          filteredFindings.map((finding) => {
            let badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            if (finding.severity === 'critical') {
              badgeStyle = 'bg-red-500/15 text-red-400 border-red-500/30 font-bold';
            } else if (finding.severity === 'high') {
              badgeStyle = 'bg-orange-500/15 text-orange-400 border-orange-500/30 font-semibold';
            } else if (finding.severity === 'medium') {
              badgeStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            }

            return (
              <div
                key={finding.id}
                className="p-4 rounded-lg bg-[#121826] border border-[#1e2638] space-y-3 hover:border-[#2b3752] transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs uppercase tracking-wide border ${badgeStyle}`}>
                      {finding.severity}
                    </span>
                    <span className="text-xs font-medium text-zinc-400">{finding.category}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-[#0b0f19] px-2 py-1 rounded border border-[#1e2638]">
                    <CodeIcon className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-200">{finding.file}</span>
                    <span className="text-blue-400">:L{finding.line}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white">{finding.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{finding.impact}</p>
                </div>

                {/* Code Evidence Block */}
                <div className="rounded bg-[#080b12] p-2.5 border border-[#1e2638] font-mono text-xs text-zinc-300 overflow-x-auto">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 select-none">
                    Evidence Snippet
                  </div>
                  <code className="text-red-300">{finding.evidence}</code>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={() => setDismissingFinding(finding)}
                    className="text-xs text-zinc-400 hover:text-red-400 transition-colors font-medium"
                  >
                    Dismiss Finding
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-[#121826] rounded-lg border border-[#1e2638] space-y-2">
            <CheckCircleIcon className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="text-xs text-zinc-300 font-medium">No open security findings for this filter</p>
          </div>
        )}
      </div>

      {/* Dismissal Reason Modal */}
      {dismissingFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0f1420] border border-[#1e2638] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
              <h3 className="text-sm font-semibold text-white">Dismiss Security Finding</h3>
              <button onClick={() => setDismissingFinding(null)} className="text-zinc-400 hover:text-white">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <p className="font-medium text-white">{dismissingFinding.title}</p>

              <div>
                <label htmlFor="dismiss-reason-select" className="block text-zinc-400 mb-1">
                  Select Dismissal Reason:
                </label>
                <select
                  id="dismiss-reason-select"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value as DismissReason)}
                  className="w-full rounded-lg bg-[#121826] border border-[#1e2638] p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="false_positive">False Positive</option>
                  <option value="acceptable_risk">Acceptable Risk</option>
                  <option value="wont_fix">Won&apos;t Fix</option>
                  <option value="duplicate">Duplicate Finding</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#1e2638] pt-4">
              <button
                onClick={() => setDismissingFinding(null)}
                className="px-3 py-1.5 rounded-lg bg-[#121826] text-zinc-300 text-xs hover:bg-[#1a2336]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDismiss}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
              >
                Confirm Dismissal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
