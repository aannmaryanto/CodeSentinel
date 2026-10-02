import re
from typing import List
from app.services.scanner.rules.base import BaseRule, FindingResult
from app.services.scanner.rules.utils import is_comment_line, is_rule_definition_line

DANGEROUS_PATTERNS = [
    {
        "rule_id": "DANG-001",
        "title": "Use of Dangerous Function eval()",
        "pattern": r"\beval\s*\(",
        "severity": "critical",
        "category": "Dangerous Functions",
        "description": "The eval() function dynamically parses and executes code strings, which can lead to Remote Code Execution (RCE).",
        "recommendation": "Avoid using eval(). Use ast.literal_eval() for safe data parsing or safer alternative data structures.",
    },
    {
        "rule_id": "DANG-002",
        "title": "Use of Dangerous Function exec()",
        "pattern": r"\bexec\s*\(",
        "severity": "critical",
        "category": "Dangerous Functions",
        "description": "The exec() function executes arbitrary Python code strings at runtime.",
        "recommendation": "Refactor code to avoid dynamic code execution.",
    },
    {
        "rule_id": "DANG-003",
        "title": "Use of os.system() for Command Execution",
        "pattern": r"\bos\.system\s*\(",
        "severity": "high",
        "category": "Dangerous Functions",
        "description": "os.system() spawns a subshell process and does not escape arguments safely.",
        "recommendation": "Use subprocess.run with argument vectors (shell=False) instead.",
    },
    {
        "rule_id": "DANG-004",
        "title": "Unsafe subprocess Execution with shell=True",
        "pattern": r"subprocess\.(?:Popen|call|run|check_output|check_call)\s*\([^)]*shell\s*=\s*True",
        "severity": "high",
        "category": "Dangerous Functions",
        "description": "Executing subprocess commands through system shell can allow command injection.",
        "recommendation": "Pass shell=False and supply arguments as an explicit array of strings.",
    },
    {
        "rule_id": "DANG-005",
        "title": "Use of Dangerous Deserialization pickle.loads()",
        "pattern": r"\bpickle\.(?:loads|load)\s*\(",
        "severity": "high",
        "category": "Dangerous Functions",
        "description": "Pickle deserialization of untrusted data allows arbitrary code execution.",
        "recommendation": "Use safer serialization formats such as JSON or Protocol Buffers.",
    },
]


class DangerousFunctionRule(BaseRule):
    rule_id = "DANG-GROUP"
    name = "Dangerous Function Detection Rule"
    description = "Detects dangerous Python standard library functions like eval, exec, os.system, and unsafe subprocess calls."
    severity = "critical"
    category = "Dangerous Functions"

    def analyze_file(
        self, file_path: str, relative_path: str, content: str
    ) -> List[FindingResult]:
        findings: List[FindingResult] = []
        lines = content.splitlines()

        for line_idx, line in enumerate(lines, start=1):
            if is_rule_definition_line(line):
                continue

            # If line is a comment, only flag if it's commented-out executable code (e.g. # eval(input))
            # but ignore prose doc comments (e.g. # Avoid using eval() here)
            if is_comment_line(line):
                # If comment line doesn't match an actual function call invocation pattern, skip prose comment
                is_commented_code = False
                for item in DANGEROUS_PATTERNS:
                    # Match if comment contains commented-out code call pattern like `# eval(...)` or `# os.system(...)`
                    if re.search(r"^\s*(?:#|//|/\*|\*|--)\s*(?:\b(?:eval|exec|os\.system|pickle\.(?:loads|load))\s*\(|subprocess\.)", line):
                        is_commented_code = True
                        break
                if not is_commented_code:
                    continue

            for item in DANGEROUS_PATTERNS:
                matches = re.finditer(item["pattern"], line)
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
