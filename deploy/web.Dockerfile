# The Next.js app. Built from the repository root: docker compose (deploy/) does this.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The /api/v1 rewrite is fixed at build time, so the API's address is a build argument.
ARG BACKEND_URL=http://api:8000
# Shown in the browser bundle, so also fixed at build time. Keep it equal to the API's setting.
ARG NEXT_PUBLIC_ADMIN_IDLE_MINUTES=30
ENV BACKEND_URL=$BACKEND_URL NEXT_PUBLIC_ADMIN_IDLE_MINUTES=$NEXT_PUBLIC_ADMIN_IDLE_MINUTES \
    NEXT_STANDALONE=1 NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/login > /dev/null || exit 1
CMD ["node", "server.js"]
