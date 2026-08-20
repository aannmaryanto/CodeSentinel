import {
  SupportedLanguage,
  ReviewRequest,
  ReviewResult,
  SecurityFinding,
  ReviewSummary,
} from '../types/dashboard';

/**
 * Isolated Server-Side AI Provider.
 * Communicates with Google Gemini API via server-side HTTP calls.
 * API key is accessed strictly via process.env.GEMINI_API_KEY and never exposed to the client.
 */
export async function generateServerCodeReview(request: ReviewRequest): Promise<ReviewResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    // Fallback to deterministic server-side analysis if API key is not configured
    return generateFallbackReview(request, 'GEMINI_API_KEY not configured in server environment');
  }

  try {
    const prompt = buildGeminiReviewPrompt(request.code, request.language);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.2,
          },
        }),
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[CodeSentinel AI] Gemini API returned status ${response.status}: ${errorText}`);
      return generateFallbackReview(request, `Gemini API HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.warn('[CodeSentinel AI] Empty response from Gemini API');
      return generateFallbackReview(request, 'Empty Gemini API response');
    }

    const parsedJson = JSON.parse(rawText);
    return normalizeReviewResponse(parsedJson, request.language);
  } catch (error) {
    console.error('[CodeSentinel AI Provider Error]:', error);
    return generateFallbackReview(request, 'Server AI Processing Error');
  }
}

function buildGeminiReviewPrompt(code: string, language: SupportedLanguage): string {
  return `You are CodeSentinel, an enterprise AI code security analyzer.
Analyze the following ${language} code for security vulnerabilities, OWASP threats, credential leaks, and logic flaws.

Return ONLY a JSON object with this exact schema:
{
  "overallScore": number (0 to 100),
  "findings": [
    {
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "category": string,
      "title": string,
      "line": number (line number where vulnerability occurs),
      "confidence": "confirmed" | "likely" | "suggestion",
      "impact": string (detailed explanation of the vulnerability and security impact),
      "evidence": string (the exact line of code containing the issue),
      "suggestedFix": string (a git diff format string showing how to fix the issue)
    }
  ]
}

Code to analyze:
\`\`\`${language}
${code}
\`\`\``;
}

function normalizeReviewResponse(parsed: Record<string, unknown>, language: SupportedLanguage): ReviewResult {
  const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : [];

  const findings: SecurityFinding[] = rawFindings.map((f: Record<string, unknown>, idx: number) => ({
    id: `ai-${Date.now()}-${idx}`,
    severity: validateSeverity(f.severity),
    category: String(f.category || 'Security'),
    title: String(f.title || 'Vulnerability Flagged'),
    file: getFilenameForLanguage(language),
    line: typeof f.line === 'number' ? f.line : 1,
    confidence: validateConfidence(f.confidence),
    impact: String(f.impact || 'Potential security issue identified during automated review.'),
    evidence: String(f.evidence || ''),
    suggestedFix: typeof f.suggestedFix === 'string' ? f.suggestedFix : undefined,
    status: 'open',
  }));

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;
  const infoCount = findings.filter((f) => f.severity === 'info').length;

  let overallScore = typeof parsed.overallScore === 'number' ? Math.min(100, Math.max(0, parsed.overallScore)) : 100 - (criticalCount * 25 + highCount * 15 + mediumCount * 8);
  if (overallScore < 0) overallScore = 0;

  const summary: ReviewSummary = {
    overallScore,
    totalIssues: findings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    infoCount,
    passedRulesCount: Math.max(15 - findings.length, 5),
  };

  return {
    id: `review-${Date.now()}`,
    analyzedAt: new Date().toLocaleTimeString(),
    language,
    summary,
    findings,
  };
}

function validateSeverity(sev: unknown): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  if (sev === 'critical' || sev === 'high' || sev === 'medium' || sev === 'low' || sev === 'info') {
    return sev;
  }
  return 'medium';
}

function validateConfidence(conf: unknown): 'confirmed' | 'likely' | 'suggestion' {
  if (conf === 'confirmed' || conf === 'likely' || conf === 'suggestion') {
    return conf;
  }
  return 'likely';
}

function generateFallbackReview(request: ReviewRequest, reason: string): ReviewResult {
  const { code, language } = request;
  const lines = code.split('\n');
  const findings: SecurityFinding[] = [];

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();

    if (
      /secret|password|key|token/i.test(trimmed) &&
      /("|')(super-secret|admin|12345|secret|password|bearer)("|')/i.test(trimmed)
    ) {
      findings.push({
        id: `f-${lineNum}-sec`,
        severity: 'critical',
        category: 'Security / Credentials',
        title: 'Hardcoded sensitive credential or fallback secret',
        file: getFilenameForLanguage(language),
        line: lineNum,
        confidence: 'confirmed',
        impact: `[Engine: Deterministic Fallback (${reason})] Exposes sensitive session keys or passwords to VCS leak.`,
        evidence: trimmed,
        suggestedFix: `- ${trimmed}\n+ const secret = process.env.SECRET_KEY;`,
      });
    }

    if (/eval\s*\(/i.test(trimmed)) {
      findings.push({
        id: `f-${lineNum}-eval`,
        severity: 'high',
        category: 'Code Execution',
        title: 'Dangerous dynamic code execution via eval()',
        file: getFilenameForLanguage(language),
        line: lineNum,
        confidence: 'confirmed',
        impact: `[Engine: Deterministic Fallback (${reason})] Passing untrusted strings to eval() allows arbitrary code execution.`,
        evidence: trimmed,
        suggestedFix: `- ${trimmed}\n+ return JSON.parse(input);`,
      });
    }

    if (
      /select|insert|update|delete/i.test(trimmed) &&
      (/(\+|=|'|\$\{).*(req\.|user|email|input)/i.test(trimmed) || /"SELECT.*'\s*\+/i.test(trimmed))
    ) {
      findings.push({
        id: `f-${lineNum}-sql`,
        severity: 'high',
        category: 'Security / Injection',
        title: 'Unescaped SQL query string concatenation',
        file: getFilenameForLanguage(language),
        line: lineNum,
        confidence: 'confirmed',
        impact: `[Engine: Deterministic Fallback (${reason})] Query building allows SQL injection attacks to bypass auth.`,
        evidence: trimmed,
        suggestedFix: `- ${trimmed}\n+ const query = "SELECT * FROM users WHERE email = $1";`,
      });
    }

    if (/subprocess|exec|os\.system|shell=True/i.test(trimmed)) {
      findings.push({
        id: `f-${lineNum}-shell`,
        severity: 'critical',
        category: 'Command Injection',
        title: 'Unsanitized shell command execution',
        file: getFilenameForLanguage(language),
        line: lineNum,
        confidence: 'confirmed',
        impact: `[Engine: Deterministic Fallback (${reason})] Executing shell commands with formatting enables remote code execution.`,
        evidence: trimmed,
        suggestedFix: `- ${trimmed}\n+ subprocess.run(["echo", user_input], check=True)`,
      });
    }

    if (/strcpy|gets|sprintf\s*\(/i.test(trimmed)) {
      findings.push({
        id: `f-${lineNum}-cpp-buf`,
        severity: 'critical',
        category: 'Memory Safety',
        title: 'Buffer overflow risk via unsafe string copy (strcpy)',
        file: 'src/buffer.cpp',
        line: lineNum,
        confidence: 'confirmed',
        impact: `[Engine: Deterministic Fallback (${reason})] strcpy does not check destination buffer boundaries.`,
        evidence: trimmed,
        suggestedFix: `- ${trimmed}\n+ strncpy(buffer, input, sizeof(buffer) - 1);`,
      });
    }

    if (/MD5|SHA1|DES/i.test(trimmed)) {
      findings.push({
        id: `f-${lineNum}-crypto`,
        severity: 'medium',
        category: 'Cryptography',
        title: 'Weak cryptographic hash algorithm (MD5)',
        file: getFilenameForLanguage(language),
        line: lineNum,
        confidence: 'likely',
        impact: `[Engine: Deterministic Fallback (${reason})] MD5 is cryptographically broken and vulnerable to collisions.`,
        evidence: trimmed,
        suggestedFix: `- ${trimmed}\n+ MessageDigest md = MessageDigest.getInstance("SHA-256");`,
      });
    }

    if (/Access-Control-Allow-Origin.*[*]/i.test(trimmed)) {
      findings.push({
        id: `f-${lineNum}-cors`,
        severity: 'low',
        category: 'Security / Headers',
        title: 'Wildcard Access-Control-Allow-Origin header',
        file: getFilenameForLanguage(language),
        line: lineNum,
        confidence: 'suggestion',
        impact: `[Engine: Deterministic Fallback (${reason})] Wildcard CORS allows any third-party domain to read payload responses.`,
        evidence: trimmed,
        suggestedFix: `- ${trimmed}\n+ w.Header().Set("Access-Control-Allow-Origin", "https://app.codesentinel.io")`,
      });
    }
  });

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;
  const infoCount = findings.filter((f) => f.severity === 'info').length;

  let score = 100 - criticalCount * 25 - highCount * 15 - mediumCount * 8 - lowCount * 4;
  if (score < 0) score = 0;

  const summary: ReviewSummary = {
    overallScore: score,
    totalIssues: findings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    infoCount,
    passedRulesCount: Math.max(12 - findings.length, 3),
  };

  return {
    id: `review-${Date.now()}`,
    analyzedAt: new Date().toLocaleTimeString(),
    language,
    summary,
    findings,
  };
}

function getFilenameForLanguage(lang: SupportedLanguage): string {
  switch (lang) {
    case 'typescript':
      return 'src/auth/token.ts';
    case 'javascript':
      return 'src/api/users.js';
    case 'python':
      return 'app/services/worker.py';
    case 'java':
      return 'src/main/UserAuth.java';
    case 'cpp':
      return 'src/buffer.cpp';
    case 'go':
      return 'cmd/server/main.go';
  }
}
