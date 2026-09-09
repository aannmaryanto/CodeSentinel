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

## 7. Authentication API Endpoints & Local Testing

The backend includes JWT-based user authentication.

### Required Environment Variables (`.env`)
```env
SECRET_KEY=dev_secret_key_change_in_production_32_bytes_min
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Endpoints:
1. **User Registration**: `POST /api/v1/auth/register`
   - **Body**: `{"name": "John Doe", "email": "john@example.com", "password": "SecurePassword123"}`
   - **Response**: `{"access_token": "<jwt>", "token_type": "bearer", "user": {"id": "...", "name": "John Doe", "email": "john@example.com", "role": "developer", ...}}`

2. **User Login**: `POST /api/v1/auth/login`
   - **Body**: `{"email": "john@example.com", "password": "SecurePassword123"}`
   - **Response**: `{"access_token": "<jwt>", "token_type": "bearer", "user": {...}}`

3. **Current User Profile**: `GET /api/auth/me` or `GET /api/v1/auth/me`
   - **Header**: `Authorization: Bearer <access_token>`
   - **Response**: `{"id": "...", "name": "John Doe", "email": "john@example.com", "role": "developer", ...}`

### Local Testing with cURL:
```bash
# 1. Register a new user
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "Password123!"}'

# 2. Login to get access token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123!"}'

# 3. Access current user endpoint with token
curl -X GET "http://localhost:8000/api/auth/me" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

---

## 8. Project Management API Endpoints

Authenticated users can manage their code analysis projects.

### Endpoints:
1. **Create Project**: `POST /api/projects` or `POST /api/v1/projects`
   - **Header**: `Authorization: Bearer <access_token>`
   - **Body**: `{"name": "CodeSentinel Engine", "description": "AI Code Scanner", "repository_url": "https://github.com/org/repo"}`
   - **Status**: `201 Created`

2. **List My Projects**: `GET /api/projects` or `GET /api/v1/projects`
   - **Header**: `Authorization: Bearer <access_token>`
   - **Status**: `200 OK`

3. **Get Single Project**: `GET /api/projects/{id}` or `GET /api/v1/projects/{id}`
   - **Header**: `Authorization: Bearer <access_token>`
   - **Status**: `200 OK` (Returns `403 Forbidden` if project belongs to another user)

4. **Update Project**: `PUT /api/projects/{id}` or `PUT /api/v1/projects/{id}`
   - **Header**: `Authorization: Bearer <access_token>`
   - **Body**: `{"name": "Updated Name", "description": "Updated Description"}`
   - **Status**: `200 OK` (Returns `403 Forbidden` if project belongs to another user)

5. **Delete Project**: `DELETE /api/projects/{id}` or `DELETE /api/v1/projects/{id}`
   - **Header**: `Authorization: Bearer <access_token>`
   - **Status**: `204 No Content` (Returns `403 Forbidden` if project belongs to another user)

---

## 9. Code Source Input API Endpoints

Authenticated users can submit source code archives (`.zip`, `.tar.gz`, `.tgz`, `.tar`) to their projects for security scanning.

### Endpoints:
1. **Submit Source Code Archive**: `POST /api/projects/{project_id}/source` or `POST /api/v1/projects/{project_id}/source`
   - **Header**: `Authorization: Bearer <access_token>`
   - **Form**: `file` (Multipart file upload)
   - **Status**: `201 Created`

2. **Get Latest Source Metadata**: `GET /api/projects/{project_id}/source` or `GET /api/v1/projects/{project_id}/source`
   - **Header**: `Authorization: Bearer <access_token>`
   - **Status**: `200 OK`

### Security Protections Implemented:
- **Path Traversal Prevention**: Resolves canonical absolute paths before extraction. Rejects entries attempting path traversal (e.g. `../`, `/etc/passwd`).
- **Archive Size & Decompression Bomb Defense**: Enforces maximum upload file size (25MB), maximum uncompressed total size (100MB), and maximum file count (5,000 files).
- **Execution Safeguard**: Uploaded code is stored in isolated directories (`storage/sources/{project_id}/{source_id}/extracted/`) and is **never** executed.
- **SHA-256 Checksumming**: Calculates cryptographic hashes to verify source integrity.

### Local Testing with cURL:
```bash
# Submit source code archive to project
curl -X POST "http://localhost:8000/api/projects/<PROJECT_ID>/source" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -F "file=@my_source_code.zip"

# Fetch latest source metadata for project
curl -X GET "http://localhost:8000/api/projects/<PROJECT_ID>/source" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

---

## 10. Running Backend Tests

```bash
# Run test suite with pytest
pytest -v

# Run test suite with coverage report
pytest --cov=app -v
```
