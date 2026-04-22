# Stage 1: Build client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build server  
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/ ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=client-builder /app/client/dist ./public
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/myevents.db"
EXPOSE 3000
CMD ["node", "dist/index.js"]
