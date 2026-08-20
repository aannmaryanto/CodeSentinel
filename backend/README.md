# CodeSentinel Backend Core API Service

The backend core API service for **CodeSentinel** built with Python 3.11+, FastAPI, SQLAlchemy 2.0 (AsyncIO), Alembic, and PostgreSQL 15+.

---

## 1. Prerequisites

- **Python**: 3.11 or higher (Python 3.12 verified)
- **PostgreSQL**: 15 or higher (with native UUID generation)
- **Redis**: 7.0 or higher (for Celery background task queue in Phase 7)

---

## 2. Setting Up Virtual Environment

From the `backend/` directory:

### On Windows (PowerShell):
```powershell
# Create Python virtual environment
"C:\Users\ANN MARY ANTO\AppData\Local\Programs\Python\Python312\python.exe" -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip
```

### On Linux / macOS:
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
```

---

## 3. Installing Dependencies

```bash
pip install -r requirements.txt
```

---

## 4. Configuration (`DATABASE_URL`)

1. Copy `.env.example` to `.env` inside `backend/`:
   ```bash
   cp .env.example .env
   ```
2. Configure your PostgreSQL connection strings in `.env`:
   ```env
   # Async Connection for FastAPI Runtime (asyncpg)
   DATABASE_URL=postgresql+asyncpg://sentinel:secret@localhost:5432/codesentinel_dev

   # Sync Connection for Alembic Migrations (psycopg2)
   DATABASE_SYNC_URL=postgresql+psycopg2://sentinel:secret@localhost:5432/codesentinel_dev
   ```

---

## 5. Database Migrations (Alembic)

Alembic serves as the single source of truth for PostgreSQL schema creation and updates.

```bash
# Check current migration revision
alembic current

# Run all pending database migrations to head
alembic upgrade head

# Rollback last migration revision
alembic downgrade -1
```

---

## 6. Running the FastAPI Application

```bash
# Start development server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Access API Documentation:
- Swagger Interactive UI: `http://localhost:8000/docs`
- ReDoc UI: `http://localhost:8000/redoc`
- Health Endpoint: `http://localhost:8000/health`

---

## 7. Running Backend Tests

```bash
# Run test suite with pytest
pytest -v

# Run test suite with coverage report
pytest --cov=app -v
```
