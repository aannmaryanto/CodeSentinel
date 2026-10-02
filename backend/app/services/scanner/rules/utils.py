import re

# Explicit template placeholder patterns (e.g. <YOUR_KEY>, ${API_KEY}, INSERT_SECRET_HERE)
EXPLICIT_PLACEHOLDER_REGEX = re.compile(
    r"^(?:<[^>]+>|\$\{[^}]+\}|\{\{[^}]+\}|YOUR_[A-Z0-9_]+_HERE|INSERT_[A-Z0-9_]+_HERE|CHANGE_ME_IN_PROD|0000000000000000+|xxx+|dummy_value_placeholder)$",
    re.IGNORECASE,
)


def is_explicit_placeholder(value: str) -> bool:
    """
    Returns True ONLY if value is an explicit template placeholder like <YOUR_API_KEY>,
    ${ENV_VAR}, {{SECRET}}, or INSERT_KEY_HERE.
    Does NOT return True for empty strings (which occur when a regex pattern has no capture groups).
    """
    val = value.strip()
    if not val:
        return False
    return bool(EXPLICIT_PLACEHOLDER_REGEX.match(val))


def is_comment_line(line: str) -> bool:
    """
    Checks if a line is a comment line in common programming languages.
    """
    stripped = line.strip()
    return (
        stripped.startswith("#")
        or stripped.startswith("//")
        or stripped.startswith("/*")
        or stripped.startswith("*")
        or stripped.startswith("<!--")
        or stripped.startswith("--")
    )


def is_rule_definition_line(line: str) -> bool:
    """
    Checks if a line is part of a security scanner rule definition dict/pattern.
    """
    stripped = line.strip()
    return (
        '"pattern":' in stripped
        or "'pattern':" in stripped
        or '"rule_id":' in stripped
        or "'rule_id':" in stripped
        or "DANGEROUS_PATTERNS" in stripped
        or "CREDENTIAL_PATTERNS" in stripped
        or "INJECTION_PATTERNS" in stripped
        or "SECRET_PATTERNS" in stripped
    )
