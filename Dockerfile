# ─── All-in-one: Bun + Next.js + Elysia + PostgreSQL ───
FROM oven/bun:1 AS base

# Install PostgreSQL + supervisor
RUN apt-get update && apt-get install -y \
    postgresql \
    postgresql-client \
    supervisor \
    curl \
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

# ─── PostgreSQL setup ───
USER postgres
RUN /etc/init.d/postgresql start && \
    psql --command "CREATE USER chatty WITH SUPERUSER PASSWORD 'chatty';" && \
    createdb -O chatty chatty && \
    /etc/init.d/postgresql stop

# Switch back to root for supervisor
USER root

# Allow external connections to PostgreSQL
RUN echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/*/main/pg_hba.conf && \
    echo "listen_addresses='*'" >> /etc/postgresql/*/main/postgresql.conf

# ─── Supervisor config ───
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports: Next.js (3000), Elysia (4000), PostgreSQL (5432)
EXPOSE 3000 4000 5432

ENV DATABASE_URL=postgres://chatty:chatty@localhost:5432/chatty
ENV NODE_ENV=production

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
