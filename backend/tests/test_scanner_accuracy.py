import os
import tempfile
import pytest
from app.services.scanner.engine import ScanEngine
from app.services.scanner.rules.dangerous_functions import DangerousFunctionRule
from app.services.scanner.rules.credentials import CredentialDetectionRule
from app.services.scanner.rules.secrets import SecretDetectionRule
from app.services.scanner.rules.injection import InjectionRule
from app.services.scanner.rules.ast_analyzer import PythonASTRule


def test_genuine_vulnerabilities_are_flagged():
    vulnerable_code = """
import os, subprocess

# 1. Real eval call
res = eval("1 + 1")

# 2. Real os.system call
os.system("ls " + user_input)

# 3. Real hardcoded password
db_password = "MySuperSecretPassword123!"

# 4. Real AWS key secret
AWS_KEY = "AKIA1234567890ABCDEF"

# 5. Real SQL injection
query = "SELECT * FROM users WHERE name = '" + user_input + "'"
"""
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = os.path.join(temp_dir, "vulnerable.py")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(vulnerable_code)

        engine = ScanEngine()
        findings = engine.scan_workspace(temp_dir)

        rule_ids = [f.rule_id for f in findings]
        categories = [f.category for f in findings]

        # Ensure genuine vulnerabilities were detected
        assert any(r in {"DANG-001", "AST-001"} for r in rule_ids), "eval() must be flagged"
        assert any(r in {"DANG-003", "INJ-003", "AST-003"} for r in rule_ids), "os.system must be flagged"
        assert any("CRED" in r or "AST-005" in r for r in rule_ids), "Hardcoded password must be flagged"
        assert "SEC-003" in rule_ids, "AWS Key must be flagged"
        assert any("INJ" in r for r in rule_ids), "SQL Injection must be flagged"


def test_secret_in_comment_is_flagged():
    comment_secret_code = """
# Setup AWS credentials:
# AWS_ACCESS_KEY_ID = AKIA1234567890ABCDEF
# Private key: -----BEGIN PRIVATE KEY-----
"""
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = os.path.join(temp_dir, "config.py")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(comment_secret_code)

        engine = ScanEngine()
        findings = engine.scan_workspace(temp_dir)
        rule_ids = [f.rule_id for f in findings]

        # Secrets hidden in comments MUST still be detected
        assert "SEC-003" in rule_ids, "AWS Key in comment must be detected"
        assert "SEC-001" in rule_ids, "Private key in comment must be detected"


def test_prose_comments_and_placeholders_are_not_flagged():
    clean_code = """
# Security Guidelines:
# 1. Do not use eval() or exec() in production code. Use ast.literal_eval() instead.
# 2. Avoid os.system() and subprocess shell=True to prevent command injection.

# Configuration template with explicit placeholders:
AWS_ACCESS_KEY_ID = "<YOUR_AWS_ACCESS_KEY_HERE>"
SECRET_TOKEN = "${ENV_SECRET_TOKEN}"
DB_PASSWORD = "INSERT_DATABASE_PASSWORD_HERE"
"""
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = os.path.join(temp_dir, "clean_guide.py")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(clean_code)

        engine = ScanEngine()
        findings = engine.scan_workspace(temp_dir)

        # Ensure prose comments and explicit placeholders do not trigger false positives
        rule_ids = [f.rule_id for f in findings]
        assert "DANG-001" not in rule_ids, "Prose comment mentioning eval() should not trigger DANG-001"
        assert "DANG-002" not in rule_ids, "Prose comment mentioning exec() should not trigger DANG-002"
        assert "DANG-003" not in rule_ids, "Prose comment mentioning os.system() should not trigger DANG-003"
        assert "SEC-003" not in rule_ids, "Explicit placeholder <YOUR_AWS_ACCESS_KEY_HERE> should not trigger SEC-003"


def test_scanner_rule_definitions_do_not_self_flag():
    rule_def_code = """
DANGEROUS_PATTERNS = [
    {
        "rule_id": "DANG-001",
        "title": "Use of Dangerous Function eval()",
        "pattern": r"\\beval\\s*\\(",
    }
]
"""
    with tempfile.TemporaryDirectory() as temp_dir:
        rules_dir = os.path.join(temp_dir, "app", "services", "scanner", "rules")
        os.makedirs(rules_dir, exist_ok=True)
        file_path = os.path.join(rules_dir, "custom_rule.py")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(rule_def_code)

        engine = ScanEngine()
        findings = engine.scan_workspace(temp_dir)

        # Rule definition files should not flag themselves
        assert len(findings) == 0, "Scanner rule definitions must not trigger false positives on themselves"


def test_review_service_sample_snippets_not_flagged():
    sample_service_code = """
export const defaultCodeSnippets = {
  typescript: `// TypeScript Sample Code - Security Review
export function evalUserInput(input: string) {
  return eval(input);
}`,
  python: `# Python Sample Code
def run_user_script(user_input):
    command = f"echo {user_input}"
    subprocess.call(command, shell=True)
`
};
"""
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = os.path.join(temp_dir, "reviewService.ts")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(sample_service_code)

        engine = ScanEngine()
        findings = engine.scan_workspace(temp_dir)
        rule_ids = [f.rule_id for f in findings]

        # Sample code inside template string literals must NOT be flagged as dangerous function calls
        assert "DANG-001" not in rule_ids, "eval inside template literal should not be flagged"
        assert "DANG-004" not in rule_ids, "subprocess.call shell=True inside template literal should not be flagged"


def test_executable_eval_and_secrets_in_typescript_still_flagged():
    active_ts_code = """
import { jwt } from 'jsonwebtoken';

export function evalUserInput(input: string) {
    // Active executable code call
    return eval(input);
}

const HardcodedAWSKey = "AKIA1234567890ABCDEF";
"""
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = os.path.join(temp_dir, "active_service.ts")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(active_ts_code)

        engine = ScanEngine()
        findings = engine.scan_workspace(temp_dir)
        rule_ids = [f.rule_id for f in findings]

        # Active executable eval call and real AWS secret MUST still be flagged
        assert "DANG-001" in rule_ids, "Active executable eval() in TS file must be flagged"
        assert "SEC-003" in rule_ids, "Hardcoded AWS secret in TS file must be flagged"
