import re
from typing import List
from app.services.scanner.rules.base import BaseRule, FindingResult

INJECTION_PATTERNS = [
    {
        "rule_id": "INJ-001",
        "title": "Potential SQL Injection Detected",
        "pattern": r"(?:select|insert|update|delete|drop|alter)\s+.*\s*(?:\+|%|\.format\(|f['\"]).*from",
        "severity": "high",
        "category": "Injection",
        "description": "SQL query constructed using dynamic string formatting or concatenation, exposing the application to SQL injection.",
        "recommendation": "Use parameterized queries or ORM query builders instead of raw string concatenation.",
    },
    {
        "rule_id": "INJ-002",
        "title": "Potential SQL Injection in Execute Method",
        "pattern": r"\.(?:execute|raw_query|query)\s*\(\s*(?:f['\"].*SELECT.*\{|['\"].*SELECT.*\s*\+\s*|\".*SELECT.*%s.*\"%\s*|\'.*SELECT.*%s.*\'%\s*)",
        "severity": "high",
        "category": "Injection",
        "description": "Database query execute method called with formatted or concatenated SQL string.",
        "recommendation": "Pass SQL parameters as separate positional/keyword tuple arguments.",
    },
    {
        "rule_id": "INJ-003",
        "title": "Command Injection via os.system",
        "pattern": r"os\.system\s*\(\s*(?:f['\"]|.*\+|.*%|\.format)",
        "severity": "critical",
        "category": "Injection",
        "description": "Dynamic string construction inside os.system call can lead to arbitrary shell command execution.",
        "recommendation": "Avoid os.system. Use subprocess.run with argument lists (shell=False) and validate input.",
    },
    {
        "rule_id": "INJ-004",
        "title": "Command Injection via Unsafe Subprocess",
        "pattern": r"subprocess\.(?:call|Popen|run|check_output)\s*\(\s*(?:f['\"]|.*\+|.*%|\.format).*,?\s*shell\s*=\s*True",
        "severity": "critical",
        "category": "Injection",
        "description": "Subprocess called with shell=True and dynamic command strings.",
        "recommendation": "Set shell=False and pass command and arguments as a sequence of strings.",
    },
    {
        "rule_id": "INJ-005",
        "title": "Unsafe Shell Command Execution",
        "pattern": r"(?:os\.popen|commands\.getoutput|pty\.spawn)\s*\(",
        "severity": "high",
        "category": "Injection",
        "description": "Legacy unsafe shell execution method detected.",
        "recommendation": "Replace legacy popen/commands methods with secure subprocess module usage.",
    },
]


class InjectionRule(BaseRule):
    rule_id = "INJ-GROUP"
    name = "Injection Flaw Detection Rule"
    description = "Detects potential SQL injection and command injection vulnerabilities."
    severity = "high"
    category = "Injection"

    def analyze_file(
        self, file_path: str, relative_path: str, content: str
    ) -> List[FindingResult]:
        findings: List[FindingResult] = []
        lines = content.splitlines()

        for line_idx, line in enumerate(lines, start=1):
            for item in INJECTION_PATTERNS:
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
