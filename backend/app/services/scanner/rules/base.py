from dataclasses import dataclass
from typing import Optional, List
from abc import ABC, abstractmethod


@dataclass
class FindingResult:
    rule_id: str
    title: str
    description: str
    severity: str  # Must be 'critical', 'high', 'medium', 'low', or 'info'
    category: str
    file_path: str
    line_number: int
    code_snippet: Optional[str] = None
    recommendation: Optional[str] = None


class BaseRule(ABC):
    rule_id: str
    name: str
    description: str
    severity: str
    category: str

    @abstractmethod
    def analyze_file(
        self, file_path: str, relative_path: str, content: str
    ) -> List[FindingResult]:
        """
        Analyzes file content and returns a list of detected findings.
        """
        pass
