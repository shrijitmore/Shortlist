FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run build:scripts

# ── Runtime ──
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/data ./data

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_DIR=/app/data

EXPOSE 3001

CMD ["sh", "-c", "npm run seed:prod && node dist/main"]
