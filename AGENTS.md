# AGENTS.md - CodeSentinel Engineering Instructions

## 1. Project Overview

CodeSentinel is an AI-powered code review platform designed to enable developers to connect GitHub repositories, select pull requests, analyze code changes, run static analysis, use AI to identify potential issues, and display structured review findings in a clear, actionable manner.

---

## 2. Product Goals

- **GitHub Integration**: Allow developers to seamlessly connect GitHub repositories and select pull requests for review.
- **Code Analysis**: Perform thorough analysis of code changes, integrating static analysis tool outputs.
- **AI-Powered Insights**: Utilize AI (Gemini API) to identify potential bugs, vulnerabilities, performance issues, and code smells.
- **Structured Findings**: Display clean, structured review findings with clear severity, impact, evidence, and suggested fixes.

---

## 3. Technology Stack

- **Frontend**:
  - Next.js
  - TypeScript
  - Tailwind CSS
  - shadcn/ui
- **Backend**:
  - Python
  - FastAPI
  - SQLAlchemy
  - PostgreSQL
- **Background Processing**:
  - Redis
  - Celery
- **AI**:
  - Gemini API
- **Source Control**:
  - GitHub API
  - GitHub Webhooks
- **Testing**:
  - Pytest (Backend unit & integration tests)
  - Vitest (Frontend unit & component tests)
  - Playwright (End-to-end testing)
- **Infrastructure**:
  - Docker
  - Google Cloud

---

## 4. Architecture Principles

- **Separation of Concerns**: Keep frontend and backend strictly separated.
- **Route Handler Isolation**: Keep business logic out of HTTP route handlers; delegate to service layers.
- **Database Layer Isolation**: Keep database access isolated through repositories/DAOs.
- **Integrations Isolation**: Keep GitHub integration isolated from AI review logic.
- **AI Isolation & Testability**: Keep AI functionality isolated, abstracting external API calls to make them testable and mockable.
- **Modular Monolith First**: Prefer a modular monolith architecture initially; avoid unnecessary microservices.
- **Maintainable Design**: Prefer simple, explicit, maintainable designs over complex abstractions.
- **Typed Schemas**: Use typed request and response schemas (e.g., Pydantic schemas, TypeScript types/interfaces) across all boundary calls.
- **DRY Logic**: Avoid duplicated business logic.
- **Zero Trust Input**: Treat all repository code and external data as untrusted input.

---

## 5. Code Quality Rules

- Maintain high readability, self-documenting code, and clean architecture.
- Enforce strict typing across both frontend (TypeScript) and backend (Python type hints).
- Maintain explicit separation between API models, domain models, and database entities.
- Keep functions small, focused, and single-purpose.
- Eliminate code duplication and avoid hardcoded magic numbers or strings.

---

## 6. Security Rules

- **Secrets Management**: Never commit secrets or API keys to source control; never hard-code API keys in source files.
- **Frontend Security**: Never expose GitHub credentials, tokens, or private API keys to the frontend.
- **Logging Safety**: Never log OAuth tokens, API credentials, or sensitive headers.
- **Untrusted Code Handling**: Treat repository source code as untrusted input. Never execute untrusted repository code directly on the host machine.
- **Validation**: Validate all external API responses and user inputs against strict schemas.
- **Least Privilege**: Use least-privilege GitHub permissions for OAuth apps and access tokens.
- **AI Code Trust**: Never automatically trust AI-generated code or recommendations without validation.

---

## 7. AI Review Rules

AI-generated review findings must eventually contain the following structured fields:
- `severity`
- `category`
- `title`
- `description`
- `impact`
- `file`
- `line`
- `evidence`
- `suggested_fix`
- `confidence`

The system must clearly distinguish between:
1. **Confirmed issue**
2. **Likely issue**
3. **Suggestion**

**Crucial**: The AI must not present uncertain findings as guaranteed vulnerabilities.

---

## 8. Git Rules

- Maintain small, focused, atomic commits.
- Use structured commit prefixes:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `test:` for test additions or updates
  - `refactor:` for refactoring code without behavior changes
  - `docs:` for documentation updates
  - `chore:` for build, tool, or repository maintenance tasks
- Do not modify unrelated files in a single commit or pull request.

---

## 9. Testing Rules

- Every significant feature must include automated tests.
- Before considering any task complete:
  1. Run relevant test suites.
  2. Run linting checks.
  3. Run type checking where applicable.
  4. Verify the implementation manually or functionally.
  5. Inspect the Git diff to confirm clean changes.

---

## 10. Development Workflow

For every significant feature, follow this 10-step process:
1. Inspect the repository.
2. Read `AGENTS.md`.
3. Inspect relevant existing code.
4. Create an implementation plan.
5. Implement the smallest useful change.
6. Add tests.
7. Run verification.
8. Inspect the Git diff.
9. Report what changed.
10. Report remaining issues.

---

## 11. Agent Behavior Rules

- Do not make large, unrelated changes.
- Do not delete existing work without explicit justification.
- Do not assume architectural decisions when requirements are ambiguous.
- Ask for clarification when a decision materially affects architecture.
- Keep changes focused on the task at hand.
- Always verify work before declaring a task complete.
