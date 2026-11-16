# Chatty

> Self-hosted AI roleplay chat with character personas and a long-term memory graph

[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-Bun%20%2B%20Next.js%20%2B%20Elysia-000?style=flat-square)](#tech-stack)
[![CI](https://github.com/MaiAphrodite/chatty/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/MaiAphrodite/chatty/actions/workflows/ci.yml)

Chatty is a chat app for characters you write yourself: give one a system prompt, an opening line, and example dialogue, then talk to it. Replies stream token by token from any OpenAI-compatible endpoint, hosted or local. Each conversation carries a memory graph so the character keeps hold of names, places, and promises across a long thread. Accounts, characters, conversations, and memory all live in PostgreSQL, and one Docker image serves the Next.js UI and the Elysia API together.

## Features

- **Character editor.** Name, description, avatar, system prompt, first message, example dialogue, and a public or private flag. Accounts see their own work under `GET /characters/mine`.
- **Streamed replies.** `POST /chat/conversations/:id/messages` returns an SSE stream, and the Next.js handler at `apps/web/src/app/api/chat/conversations/[id]/messages/route.ts` proxies it so the browser stays same-origin.
- **Any OpenAI-compatible endpoint.** Base URL, model id, and API key per account, with a connection test that lists the models the endpoint reports. Accounts without their own settings fall back to `LLM_BASE_URL`, `LLM_MODEL`, and `LLM_API_KEY`.
- **Keys encrypted at rest.** Stored API keys are sealed with AES-256-GCM under `ENCRYPTION_KEY` before they reach the database.
- **Memory graph.** Entities, relations, and rolling summaries in `tkg_entities`, `tkg_edges`, and `tkg_summaries`, with a `manual` or `auto` mode per character and an editor for individual facts and summaries.
- **Remember a message.** `POST /chat/messages/:id/remember` sends a window around one message through extraction and files the result into the graph.
- **Sampling per send.** Temperature, top-p, max tokens, a system prompt override, and a negative prompt travel with each request, and assistant messages can be dropped from context to branch a thread.
- **Live log dashboard.** Port 4001 serves an SSE log view with `SYSTEM`, `HTTP`, `LLM`, `TKG`, and `DB` filters behind HTTP basic auth.

## Tech stack

| Component | Tech | Port |
|-----------|------|------|
| Frontend  | Next.js 15 (React 19) | `3000` |
| API       | Elysia (Bun-native) | `4000` |
| Database  | PostgreSQL | `5432` |
| Runtime   | Bun | - |
| Logs      | Elysia SSE dashboard | `4001` |

## Architecture

```
browser -> Next.js :3000 --/api/* rewrite--> Elysia :4000 -> PostgreSQL :5432
              |                                   |
              |                                   +-> OpenAI-compatible endpoint (streamed)
              +-> log dashboard :4001
```

Both processes share one image. `docker/entrypoint.sh` applies the schema with `apps/api/src/db/deploy.ts`, then `supervisord.conf` runs `bun apps/api/src/index.ts` and `next start`. Drizzle owns the schema definition in `apps/api/src/db/`, `apps/api/drizzle/` holds the generated migration, and the deploy script is hand written so it can run against an existing database.

## Getting started

### With Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:4000, health at http://localhost:4000/health
- Logs: http://localhost:4001 (`admin` / `chatty123` by default)

The compose file starts PostgreSQL 16 next to the app and waits for `pg_isready` before booting it. Register an account, then either use the default model endpoint or set your own base URL, model, and key in the user settings dialog.

### Local development

Needs Bun 1.x, Docker for the database, and a PostgreSQL reachable at `DATABASE_URL`. The default `postgres://chatty:chatty@localhost:5432/chatty` is exactly what the compose `postgres` service publishes.

```bash
docker compose up postgres -d   # database on :5432
bun install
bun run db:deploy               # idempotent schema migration
bun run db:seed                 # optional: sample character and system user
bun run dev                     # web on :3000, api on :4000
```

`bun run dev:web` and `bun run dev:api` start one side only, and `bun run build` produces the Next.js bundle. Schema work uses `bun run db:generate`, `bun run db:migrate`, and `bun run db:push`.

### Environment variables

Set these in the shell for `bun run dev`, or add them to the `chatty` service in `docker-compose.yml`. Defaults below come from the code.

| Variable | Default | Used for |
|----------|---------|----------|
| `DATABASE_URL` | `postgres://chatty:chatty@localhost:5432/chatty` | Postgres connection |
| `JWT_SECRET` | `chatty-dev-secret-please-change-in-production` | Auth cookie signing, 7 day expiry |
| `ENCRYPTION_KEY` | 64 zero hex characters | 32 byte AES-256-GCM key that seals stored LLM keys |
| `CORS_ORIGIN` | `http://localhost:3000` | Browser origin the API accepts |
| `LLM_BASE_URL` | `https://mino.redemption.pw/x/zai/glm-5` | Fallback base URL, `/v1` appended when missing |
| `LLM_API_KEY` | empty | Fallback key for accounts without their own |
| `LLM_MODEL` | `glm-5.1` | Fallback model id |
| `API_URL` | `http://localhost:4000` | Where Next.js sends `/api/*` |
| `LOGGER_DASHBOARD_USER` | `admin` | Basic auth for port 4001 |
| `LOGGER_DASHBOARD_PASSWORD` | `chatty123` | Basic auth for port 4001 |
| `MIGRATION_RETRIES` | `10` | Entrypoint migration attempts |
| `MIGRATION_RETRY_DELAY_SECONDS` | `3` | Pause between attempts |

## Project structure

```
apps/
  api/   Elysia server: auth, characters, chat, memory graph, SSE logger
  web/   Next.js App Router UI: auth, home, chat, character creation
docker/  entrypoint that migrates, then hands off to supervisord
```

## Notes and limitations

- `docker-compose.yml` passes only `DATABASE_URL`, the migration retries, and the log dashboard credentials into the container. `JWT_SECRET`, `ENCRYPTION_KEY`, `CORS_ORIGIN`, and the `LLM_*` fallbacks are not set there, so the API runs on development defaults until you add them.
- Memory extraction calls the same model endpoint as chat, so `auto` mode spends a second request per exchange.
- The web client offers edit and delete for a single message (`PATCH` and `DELETE /chat/messages/:id`), but the API only serves `remember` on that path today.
- Sessions are a cookie with a fixed 7 day expiry, with no refresh or revoke flow.
- Memory is scoped per character and conversation, with no sharing across characters.
- CI type checks both apps and builds the web bundle on every push. The image push and the SSH deploy job run on `main` only, and the deploy job needs `SERVER_HOST`, `SERVER_USER`, and `SERVER_SSH_KEY` secrets.

## License

Apache-2.0. See [`LICENSE`](LICENSE).
