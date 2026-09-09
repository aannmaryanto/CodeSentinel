import os
from typing import List, Set, Tuple
from app.services.scanner.rules import ALL_RULES, FindingResult

SUPPORTED_EXTENSIONS = {
    ".py",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".java",
    ".php",
    ".go",
    ".rb",
    ".json",
    ".yaml",
    ".yml",
    ".env",
    ".txt",
}

SKIP_DIRECTORIES = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".idea",
    ".vscode",
}

MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB


def is_binary_content(sample: bytes) -> bool:
    """
    Checks if a byte sample contains null bytes indicating a binary file.
    """
    return b"\x00" in sample


def is_safe_workspace_path(workspace_abs: str, file_path_abs: str) -> bool:
    """
    Ensures file path resolves strictly within the workspace directory.
    """
    return os.path.commonpath([workspace_abs, file_path_abs]) == workspace_abs


class ScanEngine:
    def __init__(self, rules=None):
        self.rules = rules or ALL_RULES

    def scan_workspace(self, workspace_path: str) -> List[FindingResult]:
        """
        Scans all supported source files within workspace_path using configured security rules.
        """
        workspace_abs = os.path.abspath(workspace_path)
        if not os.path.isdir(workspace_abs):
            return []

        all_findings: List[FindingResult] = []
        seen_keys: Set[Tuple[str, str, int]] = set()

        for root, dirs, files in os.walk(workspace_abs):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in SKIP_DIRECTORIES and not d.startswith(".")]

            for file_name in files:
                full_path = os.path.join(root, file_name)
                abs_file_path = os.path.abspath(full_path)

                # Path traversal / workspace boundary check
                if not is_safe_workspace_path(workspace_abs, abs_file_path):
                    continue

                # File extension check
                _, ext = os.path.splitext(file_name)
                ext_lower = ext.lower()

                # Handle files like .env or filenames with supported extensions
                if ext_lower not in SUPPORTED_EXTENSIONS and not file_name.startswith(".env"):
                    continue

                # File size check
                try:
                    stat_info = os.stat(abs_file_path)
                    if stat_info.st_size > MAX_FILE_SIZE_BYTES:
                        continue
                except Exception:
                    continue

                # Binary file check
                try:
                    with open(abs_file_path, "rb") as f:
                        sample = f.read(1024)
                        if is_binary_content(sample):
                            continue
                        f.seek(0)
                        raw_bytes = f.read()
                except Exception:
                    # Unreadable file - continue scan without crashing
                    continue

                # Decode file text
                try:
                    content = raw_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    try:
                        content = raw_bytes.decode("latin-1")
                    except Exception:
                        continue

                # Compute relative file path for reporting
                relative_path = os.path.relpath(abs_file_path, workspace_abs).replace("\\", "/")

                # Run each rule on file content safely
                for rule in self.rules:
                    try:
                        results = rule.analyze_file(abs_file_path, relative_path, content)
                        for res in results:
                            # Deduplicate by (rule_id, file_path, line_number)
                            dedup_key = (res.rule_id, res.file_path, res.line_number)
                            if dedup_key not in seen_keys:
                                seen_keys.add(dedup_key)
                                all_findings.append(res)
                    except Exception:
                        # Single rule failure should not crash scan
                        continue

        return all_findings
