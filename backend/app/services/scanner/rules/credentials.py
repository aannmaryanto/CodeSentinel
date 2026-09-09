import re
from typing import List
from app.services.scanner.rules.base import BaseRule, FindingResult

CREDENTIAL_PATTERNS = [
    {
        "rule_id": "CRED-001",
        "title": "Hardcoded Password Detected",
        "pattern": r"(?:password|passwd|pwd|db_pass|database_password)\s*[:=]\s*['\"]([^'\"]{3,})['\"]",
        "severity": "high",
        "category": "Hardcoded Credentials",
        "description": "A hardcoded password or credential assignment was detected in source code.",
        "recommendation": "Remove hardcoded passwords. Use environment variables or secret store solutions.",
    },
    {
        "rule_id": "CRED-002",
        "title": "Database Connection String with Credentials Detected",
        "pattern": r"(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|amqp|mssql):\/\/[a-zA-Z0-9_\-\.\%]+:([^@\s]+)@[a-zA-Z0-9_\-\.\:]+",
        "severity": "high",
        "category": "Hardcoded Credentials",
        "description": "A connection string containing plain-text embedded credentials was found.",
        "recommendation": "Construct connection strings dynamically from secure environment variables.",
    },
    {
        "rule_id": "CRED-003",
        "title": "Hardcoded User Credentials Detected",
        "pattern": r"(?:db_user|db_username|admin_user|admin_pass)\s*[:=]\s*['\"]([^'\"]+)['\"]",
        "severity": "medium",
        "category": "Hardcoded Credentials",
        "description": "Hardcoded database or administrative username was detected.",
        "recommendation": "Inject user credentials via environment variables or deployment config.",
    },
]


class CredentialDetectionRule(BaseRule):
    rule_id = "CRED-GROUP"
    name = "Hardcoded Credential Detection Rule"
    description = "Detects hardcoded passwords, database credentials, and connection strings."
    severity = "high"
    category = "Hardcoded Credentials"

    def analyze_file(
        self, file_path: str, relative_path: str, content: str
    ) -> List[FindingResult]:
        findings: List[FindingResult] = []
        lines = content.splitlines()

        for line_idx, line in enumerate(lines, start=1):
            # Ignore false positives like variable definitions in schemas/comments without actual values or dummy defaults in test configs if needed,
            # but match standard assignment syntax
            for item in CREDENTIAL_PATTERNS:
                matches = re.finditer(item["pattern"], line, re.IGNORECASE)
                for match in matches:
                    # Check for obvious false positives like example values in documentation comments
                    matched_val = match.group(1) if match.groups() else ""
                    if matched_val.lower() in {"dummy", "placeholder", "your_password", "change_me", "xxx"}:
                        continue
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
