import re
from typing import List
from app.services.scanner.rules.base import BaseRule, FindingResult

SECRET_PATTERNS = [
    {
        "rule_id": "SEC-001",
        "title": "Hardcoded Private Key Detected",
        "pattern": r"-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH|PGP)?\s*PRIVATE\s+KEY-----",
        "severity": "critical",
        "category": "Secret Detection",
        "description": "An unencrypted private key was found in source code.",
        "recommendation": "Remove private keys from source code and load them securely from environment variables or a key vault.",
    },
    {
        "rule_id": "SEC-002",
        "title": "Hardcoded API Key / Token Detected",
        "pattern": r"(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|bearer[_-]?token)\s*[:=]\s*['\"]([A-Za-z0-9_\-\.]{16,})['\"]",
        "severity": "critical",
        "category": "Secret Detection",
        "description": "A hardcoded API key or access token assignment was detected.",
        "recommendation": "Store API keys in environment variables or a secure configuration provider.",
    },
    {
        "rule_id": "SEC-003",
        "title": "AWS Access Key Identifier Detected",
        "pattern": r"\b(AKIA[0-9A-Z]{16})\b",
        "severity": "critical",
        "category": "Secret Detection",
        "description": "An AWS Access Key ID was detected in source code.",
        "recommendation": "Revoke the exposed key immediately and use IAM roles or environment variables.",
    },
    {
        "rule_id": "SEC-004",
        "title": "GitHub Personal Access Token Detected",
        "pattern": r"\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})\b",
        "severity": "critical",
        "category": "Secret Detection",
        "description": "A GitHub access token was found in source code.",
        "recommendation": "Revoke the token immediately and store access tokens in secure environment variables.",
    },
    {
        "rule_id": "SEC-005",
        "title": "Hardcoded Bearer Token Detected",
        "pattern": r"Bearer\s+([a-zA-Z0-9\-\._~\+\/]+=*)",
        "severity": "critical",
        "category": "Secret Detection",
        "description": "A hardcoded Bearer authorization token string was detected.",
        "recommendation": "Pass tokens dynamically in HTTP headers rather than hardcoding them.",
    },
    {
        "rule_id": "SEC-006",
        "title": "Slack Webhook URL Detected",
        "pattern": r"https://hooks\.slack\.com/services/T[a-zA-Z0-9_]+/B[a-zA-Z0-9_]+/[a-zA-Z0-9_]+",
        "severity": "high",
        "category": "Secret Detection",
        "description": "A Slack webhook URL containing embedded credentials was detected.",
        "recommendation": "Move webhook URLs to environment configuration.",
    },
]


class SecretDetectionRule(BaseRule):
    rule_id = "SEC-GROUP"
    name = "Secret Detection Rule"
    description = "Detects hardcoded API keys, tokens, private keys, and secret patterns."
    severity = "critical"
    category = "Secret Detection"

    def analyze_file(
        self, file_path: str, relative_path: str, content: str
    ) -> List[FindingResult]:
        findings: List[FindingResult] = []
        lines = content.splitlines()

        for line_idx, line in enumerate(lines, start=1):
            # Skip long comment blocks if desired or scan all lines
            for item in SECRET_PATTERNS:
                matches = re.finditer(item["pattern"], line, re.IGNORECASE)
                for match in matches:
                    snippet = line.strip()
                    if len(snippet) > 120:
                        snippet = snippet[:117] + "..."
                    findings.append(
                        FindingResult(
                            rule_id=item["rule_id"],
                            title=item["title"],
                            description=item["description"],
                            severity=item["severity"],
                            category=item["category"],
                            file_path=relative_path,
                            line_number=line_idx,
                            code_snippet=snippet,
                            recommendation=item["recommendation"],
                        )
                    )

        return findings
