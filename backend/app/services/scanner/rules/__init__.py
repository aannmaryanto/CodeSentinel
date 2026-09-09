from app.services.scanner.rules.base import BaseRule, FindingResult
from app.services.scanner.rules.secrets import SecretDetectionRule
from app.services.scanner.rules.credentials import CredentialDetectionRule
from app.services.scanner.rules.injection import InjectionRule
from app.services.scanner.rules.dangerous_functions import DangerousFunctionRule
from app.services.scanner.rules.ast_analyzer import PythonASTRule

ALL_RULES = [
    SecretDetectionRule(),
    CredentialDetectionRule(),
    InjectionRule(),
    DangerousFunctionRule(),
    PythonASTRule(),
]

__all__ = [
    "BaseRule",
    "FindingResult",
    "SecretDetectionRule",
    "CredentialDetectionRule",
    "InjectionRule",
    "DangerousFunctionRule",
    "PythonASTRule",
    "ALL_RULES",
]
