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


def get_line_template_literal_mask(content: str, relative_path: str) -> list[bool]:
    """
    Returns a boolean mask for each line in content (0-indexed matching lines array),
    where True indicates the line is inside a multiline string template literal
    (e.g., JS/TS backticks `...` or Python triple quotes \"\"\"...\"\"\").
    """
    lines = content.splitlines()
    mask = [False] * len(lines)

    ext = relative_path.lower().rsplit(".", 1)[-1] if "." in relative_path else ""
    is_js_ts = ext in {"js", "jsx", "ts", "tsx"}
    is_py = ext == "py"

    if not (is_js_ts or is_py):
        return mask

    in_multiline_str = False

    for idx, line in enumerate(lines):
        line_is_template = in_multiline_str

        if is_js_ts:
            i = 0
            while i < len(line):
                if line[i] == "`" and (i == 0 or line[i - 1] != "\\"):
                    in_multiline_str = not in_multiline_str
                    line_is_template = True
                i += 1
        elif is_py:
            for delimiter in ['"""', "'''"]:
                count = line.count(delimiter)
                if count % 2 != 0:
                    in_multiline_str = not in_multiline_str
                    line_is_template = True

        mask[idx] = line_is_template

    return mask
