# ===========================================
# StockMate Pro — Frontend
# ===========================================

# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production Stage (nginx) ----
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config with API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy PWA icons and assets
COPY --from=builder /app/public/icons /usr/share/nginx/html/icons

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
