FROM node:22-alpine AS build

WORKDIR /app

# Force development mode so npm ci installs devDependencies (tsc, typescript, etc.)
# NODE_ENV=production is set at runtime only, not build time.
ENV NODE_ENV=development

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ─── Runtime ──────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/schema.sql ./dist/db/schema.sql

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
