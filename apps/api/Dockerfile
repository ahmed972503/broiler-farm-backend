# Multi-stage Dockerfile for Broiler Farm API
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package and API
RUN npm --workspace=@broiler/shared run build
RUN npm --workspace=@broiler/api run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts

# Copy built artifacts from builder stage
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 5000

CMD ["node", "apps/api/dist/index.js"]
