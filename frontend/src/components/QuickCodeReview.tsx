'use client';

import React, { useState } from 'react';
import { SupportedLanguage } from '../types/dashboard';
import { CodeIcon, ShieldIcon, CheckCircleIcon, AlertTriangleIcon } from './Icons';

const sampleSnippets: Record<SupportedLanguage, string> = {
  typescript: `// Sample TypeScript Code for CodeSentinel Review
import { jwt } from 'jsonwebtoken';

export function authenticateUser(token: string) {
  // CRITICAL: Hardcoded JWT secret fallback
  const secret = process.env.SECRET_KEY || "super-secret-key-12345";
  return jwt.verify(token, secret);
}`,
  javascript: `// Sample JavaScript Code for CodeSentinel Review
function handleUserQuery(req, res) {
  // HIGH: Direct SQL string concatenation
  const email = req.body.email;
  const sql = "SELECT * FROM users WHERE email = '" + email + "'";
  db.query(sql, (err, result) => {
    res.json(result);
  });
}`,
  python: `# Sample Python Code for CodeSentinel Review
import subprocess

def run_user_script(user_input):
    # CRITICAL: Shell injection vulnerability
    command = f"echo {user_input}"
    subprocess.call(command, shell=True)
`,
  java: `// Sample Java Code for CodeSentinel Review
public class UserAuth {
    public boolean checkPassword(String input, String hash) {
        // MEDIUM: Weak hashing algorithm
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(input.getBytes());
        return digest.toString().equals(hash);
    }
}
`,
  go: `// Sample Go Code for CodeSentinel Review
package main

import "net/http"

func handleRequest(w http.ResponseWriter, r *http.Request) {
    // LOW: Missing security headers
    w.Write([]byte("Hello, CodeSentinel"))
}
`,
};

export function QuickCodeReview() {
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [code, setCode] = useState<string>(sampleSnippets.typescript);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as SupportedLanguage;
    setLanguage(lang);
    setCode(sampleSnippets[lang] || '');
    setAnalyzed(false);
  };

  const handleAnalyze = () => {
    if (!code.trim()) return;
    setIsAnalyzing(true);
    setAnalyzed(false);

    // Simulate instant local evaluation
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalyzed(true);
    }, 600);
  };

  return (
    <div id="quick-review-section" className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CodeIcon className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-white">Quick Code Review</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Paste code snippets below for instant Gemini AI + Semgrep static security evaluation
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
            <option value="go">Go</option>
          </select>
        </div>
      </div>

      {/* Code Textarea */}
      <div className="space-y-2">
        <label htmlFor="code-textarea" className="sr-only">
          Paste code snippet
        </label>
        <textarea
          id="code-textarea"
          rows={7}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste code snippet here for automated security review..."
          className="w-full rounded-lg bg-[#080b12] border border-[#1e2638] p-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-mono">
          {code.split('\n').length} lines • {code.length} chars
        </span>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !code.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-all"
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
              <span>Analyze Code</span>
            </>
          )}
        </button>
      </div>

      {/* Simulated Analysis Result Output */}
      {analyzed && (
        <div className="rounded-lg bg-[#121826] border border-blue-500/30 p-4 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <span>Static + AI Analysis Complete</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Score: 68/100</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-[#0b0f19] border border-[#1e2638]">
              <span className="text-zinc-500">Critical Issues:</span>{' '}
              <span className="font-bold text-red-400">1 detected</span>
            </div>
            <div className="p-2 rounded bg-[#0b0f19] border border-[#1e2638]">
              <span className="text-zinc-500">Confidence:</span>{' '}
              <span className="font-semibold text-emerald-400">Confirmed (98%)</span>
            </div>
            <div className="p-2 rounded bg-[#0b0f19] border border-[#1e2638]">
              <span className="text-zinc-500">Suggested Fix:</span>{' '}
              <span className="font-semibold text-blue-400">Available</span>
            </div>
          </div>

          <div className="text-xs text-zinc-300 bg-[#080b12] p-3 rounded border border-[#1e2638] space-y-1">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Semgrep Rule (p/security-audit): Hardcoded secret fallback</span>
            </div>
            <p className="text-zinc-400 text-[11px]">
              Avoid hardcoding default secret keys in source files. Inject credentials exclusively via environment variables.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
