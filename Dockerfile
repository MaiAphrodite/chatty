# ─── All-in-one: Bun + Next.js + Elysia ───
FROM oven/bun:1 AS base

# Install supervisor
RUN apt-get update && apt-get install -y \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

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

# Expose ports: Next.js (3000), Elysia (4000)
EXPOSE 3000 4000

ENV NODE_ENV=production

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
