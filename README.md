# Chatty

AI chat platform — Bun + Next.js + Elysia + PostgreSQL

## Stack

| Component | Tech | Port |
|-----------|------|------|
| Frontend  | Next.js 15 (React 19) | `3000` |
| API       | Elysia (Bun-native) | `4000` |
| Database  | PostgreSQL | `5432` |
| Runtime   | Bun | — |

## Quick Start (Docker)

```bash
docker compose up --build
```

Then open:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000
- **Health check:** http://localhost:4000/health

## Local Development (requires Bun)

```bash
# Install deps
bun install

# Start PostgreSQL (however you want — Docker, system, etc.)
# Then:
bun run dev
```

## Project Structure

```
chatty/
├── apps/
│   ├── api/                 # Elysia backend
│   │   ├── src/
│   │   │   ├── index.ts     # Server entry
│   │   │   └── db/
│   │   │       ├── index.ts # DB connection
│   │   │       └── schema.ts# Drizzle schema
│   │   └── drizzle.config.ts
│   └── web/                 # Next.js frontend
│       └── src/app/
│           ├── layout.tsx
│           └── page.tsx
├── Dockerfile               # All-in-one container
├── docker-compose.yml
├── supervisord.conf          # Process manager
└── package.json              # Bun workspace root
```

## Database

Using Drizzle ORM. To push schema changes:

```bash
bun run db:push
```

Credentials: `chatty:chatty@localhost:5432/chatty`
