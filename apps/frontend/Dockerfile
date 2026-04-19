FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production with Nginx ──
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config to handle SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
