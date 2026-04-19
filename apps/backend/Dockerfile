FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools needed for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run build:scripts

# Prune to production deps only (native binaries already compiled)
RUN npm prune --production

# ── Runtime ──
FROM node:20-alpine

WORKDIR /app

# Copy compiled production node_modules (avoids recompiling native addons)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data/cardekho-models.json ./data/cardekho-models.json

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_DIR=/app/data

EXPOSE 8080

CMD ["sh", "-c", "node dist/scripts/seed.js; node dist/main"]
