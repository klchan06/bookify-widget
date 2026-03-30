# ============================================
# Bookify API - Multi-stage Dockerfile
# ============================================

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install all dependencies
RUN npm ci --ignore-scripts

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules 2>/dev/null || true

# Copy source files
COPY package.json turbo.json tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/api/ ./packages/api/

# Generate Prisma client
RUN cd packages/api && npx prisma generate

# Build shared and api packages
RUN npx turbo run build --filter=@bookify/api

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 bookify && \
    adduser --system --uid 1001 bookify

# Copy built output
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma
COPY --from=builder /app/packages/api/node_modules/.prisma ./packages/api/node_modules/.prisma
COPY --from=builder /app/node_modules ./node_modules

USER bookify

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "packages/api/dist/index.js"]
