export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReviewStatus = 'critical' | 'warnings' | 'passed';

export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'go';

export interface MetricCardData {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  neutral?: boolean;
  description: string;
  icon: 'reviews' | 'critical' | 'warnings' | 'passed';
}

export interface ReviewItem {
  id: string;
  repository: string;
  prNumber: number;
  title: string;
  author: string;
  status: ReviewStatus;
  issueCount: number;
  timestamp: string;
  commitSha: string;
}

export interface SecurityFinding {
  id: string;
  severity: Severity;
  title: string;
  file: string;
  line: number;
  category: string;
  confidence: 'confirmed' | 'likely' | 'suggestion';
  impact: string;
  evidence: string;
  suggestedFix?: string;
}

export interface QuickAnalysisResult {
  analyzedAt: string;
  language: SupportedLanguage;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  findings: SecurityFinding[];
}
