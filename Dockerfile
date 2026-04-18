# ─── All-in-one: Bun + Next.js + Elysia ───
FROM oven/bun:1 AS base

ARG APP_UID=10001
ARG APP_GID=10001

# Install supervisor
RUN apt-get update && apt-get install -y \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid ${APP_GID} chatty \
    && useradd --uid ${APP_UID} --gid ${APP_GID} --create-home --shell /usr/sbin/nologin chatty

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build Next.js
RUN cd apps/web && bun run build

# ─── Supervisor config ───
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /app/docker/entrypoint.sh
RUN chmod +x /app/docker/entrypoint.sh
RUN chown -R chatty:chatty /app

# Expose ports: Next.js (3000), Elysia (4000), Logger (4001)
EXPOSE 3000 4000 4001

ENV NODE_ENV=production

ENV MIGRATION_RETRIES=10
ENV MIGRATION_RETRY_DELAY_SECONDS=3
ENV LOGGER_DASHBOARD_USER=admin
ENV LOGGER_DASHBOARD_PASSWORD=chatty123

USER chatty

CMD ["/app/docker/entrypoint.sh"]
