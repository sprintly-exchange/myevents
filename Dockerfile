# Stage 1: Install all dependencies (monorepo root)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci

# Stage 2: Build client
FROM deps AS client-builder
COPY client/ ./client/
RUN npm run build --workspace=client

# Stage 3: Build server
FROM deps AS server-builder
COPY server/ ./server/
RUN cd server && npx prisma generate
RUN npm run build --workspace=server

# Stage 4: Production
FROM node:20-alpine
WORKDIR /app
RUN mkdir -p /app/data
COPY package*.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci --omit=dev
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/
RUN cd server && npx prisma generate
COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./public
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/myevents.db"
EXPOSE 3000
CMD ["sh", "-c", "cd /app/server && npx prisma migrate deploy && node /app/dist/index.js"]
