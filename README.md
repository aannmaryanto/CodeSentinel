# CodeSentinel

An AI-powered code review platform that analyzes GitHub pull requests using static analysis and AI to identify potential bugs, security issues, performance problems, reliability concerns, and maintainability issues.

---

## 1. Overview

CodeSentinel automates code quality reviews by bridging deterministic static analysis with Google Gemini AI. Developers connect their GitHub repositories and pull requests to receive structured, contextual, and actionable code review findings—including severity, evidence snippets, impact analysis, and suggested fix diffs.

---

## 2. Core Features

- **GitHub Integration**: Connect GitHub repositories and inspect active pull requests.
- **Hybrid Code Review**: Execute Semgrep static analysis alongside Gemini AI analysis for high-accuracy defect detection.
- **Context-Aware Analysis**: Extract AST symbol signatures and modified diff hunks to ground AI prompts and reduce false positives.
- **Structured Review Findings**: Categorize findings by severity (`critical`, `high`, `medium`, `low`, `info`), category, evidence, impact, and proposed fix diffs.
- **Deduplication Engine**: Fingerprint and merge overlapping findings between static tools and AI models.
- **Automated Feedback Sync**: Optional automated posting of review findings directly back to GitHub PRs as inline comments or Check Runs.

---

## 3. Architecture

CodeSentinel is designed as a **Modular Monolith** for operational simplicity, high developer velocity, and strong component isolation.

```
User Browser
    │
    ▼
Next.js Web Dashboard
    │
    ▼ (REST API / Auth Headers)
FastAPI Backend (Modular Monolith)
    ├── Auth & Users Module
    ├── Organizations Module
    ├── GitHub Integration Module
    ├── Review Orchestrator Module
    └── Finding Pipeline Module
    │               │              │
    ▼               ▼              ▼
PostgreSQL        Redis        Celery Workers
(Relational Data) (Broker)     (Async Review Pipeline)
                                   ├── Fetch PR Diff (GitHub API)
                                   ├── Static Analysis (Semgrep)
                                   ├── AI Review (Gemini API)
                                   └── Finding Deduplication
```

Detailed architectural blueprints are available in:
- System Architecture: [`docs/architecture/system-design.md`](file:///d:/Kalvium/CodeSentinel/docs/architecture/system-design.md)
- Database Design: [`docs/architecture/database-design.md`](file:///d:/Kalvium/CodeSentinel/docs/architecture/database-design.md)
- Engineering Rules: [`AGENTS.md`](file:///d:/Kalvium/CodeSentinel/AGENTS.md)

---

## 4. Technology Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python, SQLAlchemy, Alembic
- **Data**: PostgreSQL, Redis
- **Workers**: Celery, Semgrep
- **AI**: Gemini API
- **Integration**: GitHub API, GitHub Webhooks
- **Infrastructure**: Docker, Google Cloud

---

## 5. Repository Structure

```
CodeSentinel/
├── AGENTS.md                           # Project engineering rules & behavior instructions
├── README.md                           # Project overview & developer guide
├── .env.example                        # Safe example environment template
├── .gitignore                          # Monorepo version control ignores
└── docs/
    └── architecture/
        ├── system-design.md            # System architecture & component design
        └── database-design.md          # PostgreSQL database schema & ER diagram
```

---

## 6. Development Status

> [!NOTE]
> CodeSentinel is currently in the **Architecture and Foundation Stage** (Phase 4A).
> System architecture, security guidelines, and relational database schemas have been fully designed and approved. Application source code and database migrations will be scaffolded in upcoming phases.

---

## 7. Local Development

Detailed containerized local setup using Docker Compose will be configured during application scaffolding:

1. Clone the repository:
   ```bash
   git clone https://github.com/aannmaryanto/CodeSentinel.git
   cd CodeSentinel
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
3. Refer to [`docs/architecture/system-design.md`](file:///d:/Kalvium/CodeSentinel/docs/architecture/system-design.md) for planned service configurations.

---

## 8. Environment Variables

Refer to [`.env.example`](file:///d:/Kalvium/CodeSentinel/.env.example) for required configuration keys across application services, database endpoints, Redis brokers, GitHub App credentials, and Gemini API keys.

---

## 9. Testing

CodeSentinel enforces automated testing across all layers:
- **Backend Tests**: Pytest for unit, integration, and finding pipeline tests.
- **Frontend Tests**: Vitest & React Testing Library for component tests.
- **End-to-End Tests**: Playwright for critical user journey validation.

---

## 10. Git Workflow

- **Branching**: Atomic feature branches committed with conventional commit prefixes:
  - `feat:` New feature
  - `fix:` Bug fix
  - `docs:` Documentation update
  - `refactor:` Code refactoring
  - `test:` Test updates
  - `chore:` Maintenance tasks
- **Review**: Pull requests require clean verification, passing lint checks, and clean diff inspection.

---

## 11. Security

- **Secrets Management**: Never commit secrets or private API keys to source control.
- **Untrusted Code Handling**: Treat repository source code as untrusted input.
- **Server-Side Credentials**: GitHub credentials, private keys, and OAuth secrets must remain strictly server-side and never be exposed to the frontend.
- **AI Output Trust**: AI-generated review findings must be treated as untrusted output and validated against strict Pydantic schemas.
- **Host Execution Boundary**: Arbitrary repository application code, build scripts, or package installers must not execute directly on the application host. Static analyzers run in isolated review-worker boundaries.

---

## 12. Roadmap

- [x] **Phase 1** — Project setup
- [x] **Phase 2** — Architecture
- [x] **Phase 3** — Database design
- [ ] **Phase 4** — Application scaffolding
- [ ] **Phase 5** — Authentication
- [ ] **Phase 6** — GitHub integration
- [ ] **Phase 7** — Pull request ingestion
- [ ] **Phase 8** — Static analysis
- [ ] **Phase 9** — AI review engine
- [ ] **Phase 10** — Review dashboard
- [ ] **Phase 11** — GitHub review comments
- [ ] **Phase 12** — Production deployment

---

## 13. License

Proprietary / All Rights Reserved — CodeSentinel Engineering Team.
