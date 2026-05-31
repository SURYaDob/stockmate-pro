# ===========================================
# StockMate Pro — Backend
# ===========================================

# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# ---- Production Stage ----
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl curl

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY src/ ./src/
COPY package*.json ./

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Run migrations on startup, then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
