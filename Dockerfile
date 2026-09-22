# ==============================================================================
# CodeSentinel Multi-Stage Root Dockerfile
# Provides isolated build and runtime environments for Backend & Frontend services
# ==============================================================================

# ------------------------------------------------------------------------------
# Backend Service (Python / FastAPI)
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS backend

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required for build & database access
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend dependency manifest first to leverage Docker layer caching
COPY backend/requirements.txt /app/backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend application code
COPY backend /app/backend

# Create storage directory for source uploads
RUN mkdir -p /app/backend/storage/sources

# Set working directory to backend application root
WORKDIR /app/backend

# Expose FastAPI application port
EXPOSE 8000

# Default command to start FastAPI core API service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# ------------------------------------------------------------------------------
# Frontend Service (Node.js / Next.js)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend

# Set environment variables
ENV NODE_ENV=development \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

WORKDIR /app/frontend

# Copy frontend dependency manifests
COPY frontend/package.json frontend/package-lock.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend application code
COPY frontend/ ./

# Expose Next.js development server port
EXPOSE 3000

# Default command to start Next.js dev server
CMD ["npm", "run", "dev"]
