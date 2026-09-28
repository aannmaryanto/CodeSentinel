# ==============================================================================
# CodeSentinel Next.js Frontend Dockerfile
# Build context: ./frontend
# ==============================================================================

FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=development \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

WORKDIR /app/frontend

# Copy frontend dependency manifests
COPY package.json package-lock.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend application code
COPY . ./

# Expose Next.js development server port
EXPOSE 3000

# Default command to start Next.js dev server
CMD ["npm", "run", "dev"]
