# ==============================================================================
# CodeSentinel FastAPI Backend Dockerfile
# Build context: ./backend
# ==============================================================================

FROM python:3.12-slim

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
COPY requirements.txt /app/backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend application code
COPY . /app/backend

# Create storage directory for source uploads
RUN mkdir -p /app/backend/storage/sources

# Set working directory to backend application root
WORKDIR /app/backend

# Expose FastAPI application port
EXPOSE 8000

# Default command to start FastAPI core API service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
