'use client';

import React from 'react';
import { SecurityFinding } from '../types/dashboard';
import { CodeIcon } from './Icons';

const mockFindings: SecurityFinding[] = [
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
  },
];

export function LatestFindings() {
  return (
    <div className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#1e2638] pb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Latest Security Findings</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Top vulnerabilities flagged across recent scans</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            1 Critical
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            1 High
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {mockFindings.map((finding) => {
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
