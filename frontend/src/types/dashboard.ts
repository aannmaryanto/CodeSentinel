export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReviewStatus = 'critical' | 'warnings' | 'passed';

export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'cpp' | 'go';

export type NavTab = 'dashboard' | 'reviews' | 'repos' | 'settings';

export type DismissReason = 'false_positive' | 'acceptable_risk' | 'wont_fix' | 'duplicate' | 'other';

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
  description?: string;
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
  status?: 'open' | 'dismissed' | 'resolved' | 'accepted';
  dismissReason?: DismissReason;
}

export interface ReviewRequest {
  code: string;
  language: SupportedLanguage;
  repositoryName?: string;
  filename?: string;
}

export interface ReviewSummary {
  overallScore: number;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  passedRulesCount: number;
}

export interface ReviewResult {
  id: string;
  analyzedAt: string;
  language: SupportedLanguage;
  summary: ReviewSummary;
  findings: SecurityFinding[];
}

export interface RepositoryItem {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  language: SupportedLanguage;
  defaultBranch: string;
  isPrivate: boolean;
  lastScan: string;
  updatedAt: string;
  openPRs: number;
  healthScore: number;
  vulnerabilityCount: number;
  status: 'active' | 'syncing' | 'paused';
  description?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning';
  message: string;
}
