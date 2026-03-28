FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# DATABASE_URL must be provided at runtime via environment variable.
# The build step only generates the Prisma client — it does not connect to the database.
RUN npm run build

# Run migrations then start the app.
# DATABASE_URL is injected by your hosting provider (Railway, Render, Fly.io, etc.)
CMD ["npm", "run", "docker-start"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
