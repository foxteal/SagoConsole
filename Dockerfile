FROM node:22-alpine AS builder

WORKDIR /app

# Install server dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Build server
COPY tsconfig.json ./
COPY server/ ./server/
RUN npx tsc

# Install client dependencies and build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# ── Runtime ──
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 8120

CMD ["node", "dist/index.js"]
