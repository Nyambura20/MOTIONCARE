# Multi-stage build for MotionCare - Genkit + Vertex AI

# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app

# Copy package files
COPY apps/web/package*.json ./apps/web/
COPY package*.json ./

# Install dependencies
RUN cd apps/web && npm install

# Copy frontend source
COPY apps/web/src ./apps/web/src
COPY apps/web/index.html ./apps/web/
COPY apps/web/vite.config.js ./apps/web/
COPY apps/web/tailwind.config.cjs ./apps/web/
COPY apps/web/postcss.config.cjs ./apps/web/

# Build frontend with production API URL (empty = same domain)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN cd apps/web && npm run build

# Stage 2: Production Backend + Serve Frontend
FROM node:20-slim

WORKDIR /app

# Install production dependencies
COPY apps/web/package*.json ./
RUN npm install --production

# Copy backend server files
COPY apps/web/server ./server

# Copy Vertex AI credentials
COPY apps/web/vertex-ai-key.json ./vertex-ai-key.json

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/apps/web/dist ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json

# Expose Cloud Run port
EXPOSE 8080

# Start server
CMD ["node", "server/index.js"]
