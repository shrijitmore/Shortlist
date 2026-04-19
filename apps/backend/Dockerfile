# ── Builder ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Build tools required to compile better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build && npm run build:scripts

# Drop dev deps; native binaries are already compiled
RUN npm prune --production

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine

# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy compiled artefacts from builder (no recompile of native addons)
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/data/cardekho-models.json ./data/cardekho-models.json
COPY --chown=appuser:appgroup start.sh ./start.sh

RUN chmod +x start.sh && mkdir -p /app/data && chown appuser:appgroup /app/data

USER appuser

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_DIR=/app/data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/api/health || exit 1

CMD ["./start.sh"]
