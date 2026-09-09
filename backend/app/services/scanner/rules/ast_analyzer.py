import ast
from typing import List, Optional
from app.services.scanner.rules.base import BaseRule, FindingResult


class SecurityASTVisitor(ast.NodeVisitor):
    def __init__(self, relative_path: str, lines: List[str]):
        self.relative_path = relative_path
        self.lines = lines
        self.findings: List[FindingResult] = []

    def _get_snippet(self, line_no: int) -> Optional[str]:
        if 1 <= line_no <= len(self.lines):
            snippet = self.lines[line_no - 1].strip()
            if len(snippet) > 120:
                snippet = snippet[:117] + "..."
            return snippet
        return None

    def visit_Call(self, node: ast.Call):
        func_name = ""
        module_name = ""

        if isinstance(node.func, ast.Name):
            func_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            func_name = node.func.attr
            if isinstance(node.func.value, ast.Name):
                module_name = node.func.value.id

        line_no = getattr(node, "lineno", 1)
        snippet = self._get_snippet(line_no)

        # Check eval()
        if func_name == "eval" and not module_name:
            self.findings.append(
                FindingResult(
                    rule_id="AST-001",
                    title="AST: Call to eval() Detected",
                    description="AST analysis identified a call to built-in eval() function.",
                    severity="critical",
                    category="AST Analysis",
                    file_path=self.relative_path,
                    line_number=line_no,
                    code_snippet=snippet,
                    recommendation="Remove eval() call and parse inputs safely.",
                )
            )

        # Check exec()
        elif func_name == "exec" and not module_name:
            self.findings.append(
                FindingResult(
                    rule_id="AST-002",
                    title="AST: Call to exec() Detected",
                    description="AST analysis identified a call to built-in exec() function.",
                    severity="critical",
                    category="AST Analysis",
                    file_path=self.relative_path,
                    line_number=line_no,
                    code_snippet=snippet,
                    recommendation="Avoid dynamic python code execution via exec().",
                )
            )

        # Check os.system()
        elif module_name == "os" and func_name == "system":
            self.findings.append(
                FindingResult(
                    rule_id="AST-003",
                    title="AST: Call to os.system() Detected",
                    description="AST analysis identified execution of system command via os.system().",
                    severity="high",
                    category="AST Analysis",
                    file_path=self.relative_path,
                    line_number=line_no,
                    code_snippet=snippet,
                    recommendation="Use subprocess.run with argument vector instead of os.system().",
                )
            )

        # Check subprocess with shell=True
        elif module_name == "subprocess" or func_name in {"Popen", "call", "run", "check_output"}:
            for kw in node.keywords:
                if kw.arg == "shell":
                    is_true = False
                    if isinstance(kw.value, ast.Constant) and kw.value.value is True:
                        is_true = True
                    elif isinstance(kw.value, ast.NameConstant) and kw.value.value is True:
                        is_true = True

                    if is_true:
                        self.findings.append(
                            FindingResult(
                                rule_id="AST-004",
                                title="AST: Unsafe Subprocess with shell=True",
                                description="AST analysis identified subprocess invocation with shell=True.",
                                severity="high",
                                category="AST Analysis",
                                file_path=self.relative_path,
                                line_number=line_no,
                                code_snippet=snippet,
                                recommendation="Set shell=False and pass command line arguments as a list.",
                            )
                        )

        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign):
        line_no = getattr(node, "lineno", 1)
        snippet = self._get_snippet(line_no)

        target_names = []
        for target in node.targets:
            if isinstance(target, ast.Name):
                target_names.append(target.id.lower())

        sensitive_var_names = {
            "password",
            "passwd",
            "api_key",
            "secret_key",
            "access_token",
            "db_password",
            "auth_token",
        }

        for var_name in target_names:
            if any(sens in var_name for sens in sensitive_var_names):
                # Check if assigned value is a string constant
                assigned_str = None
                if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                    assigned_str = node.value.value
                elif isinstance(node.value, ast.Str):
                    assigned_str = node.value.s

                if assigned_str and len(assigned_str) >= 3:
                    if assigned_str.lower() not in {"dummy", "placeholder", "change_me", "xxx"}:
                        self.findings.append(
                            FindingResult(
                                rule_id="AST-005",
                                title="AST: Hardcoded Sensitive Assignment Detected",
                                description=f"AST analysis detected string literal assignment to sensitive variable '{var_name}'.",
                                severity="high",
                                category="AST Analysis",
                                file_path=self.relative_path,
                                line_number=line_no,
                                code_snippet=snippet,
                                recommendation="Load secrets from environment variables or secure configuration.",
                            )
                        )

        self.generic_visit(node)


class PythonASTRule(BaseRule):
    rule_id = "AST-GROUP"
    name = "Python AST Analysis Rule"
    description = "Safely parses Python AST nodes to identify dangerous functions, injection patterns, and hardcoded credentials without executing source code."
    severity = "high"
    category = "AST Analysis"

    def analyze_file(
        self, file_path: str, relative_path: str, content: str
    ) -> List[FindingResult]:
        if not relative_path.endswith(".py"):
            return []

        try:
            tree = ast.parse(content, filename=relative_path)
            lines = content.splitlines()
            visitor = SecurityASTVisitor(relative_path, lines)
            visitor.visit(tree)
            return visitor.findings
        except Exception:
            # Malformed syntax in submitted source code: handle gracefully, line-by-line regex rules will still apply
            return []
