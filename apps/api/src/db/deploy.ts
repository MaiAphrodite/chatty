import { db } from "./index";
import { sql } from "drizzle-orm";

const migrations = [
  sql`
    CREATE TABLE IF NOT EXISTS users (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username   TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  sql`
    CREATE TABLE IF NOT EXISTS characters (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name             TEXT NOT NULL,
      description      TEXT NOT NULL DEFAULT '',
      system_prompt    TEXT NOT NULL,
      avatar_url       TEXT,
      first_message    TEXT NOT NULL,
      example_dialogue TEXT,
      is_public        BOOLEAN NOT NULL DEFAULT true,
      creator_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      title        TEXT,
      created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  sql`
    CREATE TABLE IF NOT EXISTS messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL,
      content         TEXT NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,

  // --- Additive column migrations (idempotent via ADD COLUMN IF NOT EXISTS) ---

  sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS description      TEXT NOT NULL DEFAULT ''`,
  sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS first_message    TEXT`,
  sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS example_dialogue TEXT`,
  sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_public        BOOLEAN NOT NULL DEFAULT true`,
  sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS creator_id       UUID`,
  sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMP NOT NULL DEFAULT NOW()`,

  // Backfill: seed a system user for any orphaned pre-creator_id rows
  sql`
    INSERT INTO users (username, password_hash)
    VALUES ('system', '*')
    ON CONFLICT (username) DO NOTHING
  `,
  sql`
    UPDATE characters
    SET first_message = '...'
    WHERE first_message IS NULL
  `,
  sql`
    UPDATE characters
    SET creator_id = (SELECT id FROM users WHERE username = 'system')
    WHERE creator_id IS NULL
  `,
  sql`ALTER TABLE characters ALTER COLUMN first_message SET NOT NULL`,
  sql`ALTER TABLE characters ALTER COLUMN creator_id    SET NOT NULL`,

  sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`,

  // --- TKG Memory System (ADR-012) ---

  sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS memory_mode TEXT NOT NULL DEFAULT 'manual'`,

  sql`
    CREATE TABLE IF NOT EXISTS tkg_entities (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      character_id   UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name           TEXT NOT NULL,
      entity_type    TEXT NOT NULL DEFAULT 'thing',
      first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      mention_count  INT NOT NULL DEFAULT 1,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,

  sql`
    CREATE TABLE IF NOT EXISTS tkg_edges (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      character_id      UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_entity_id  UUID NOT NULL REFERENCES tkg_entities(id) ON DELETE CASCADE,
      target_entity_id  UUID NOT NULL REFERENCES tkg_entities(id) ON DELETE CASCADE,
      predicate         TEXT NOT NULL,
      valid_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      valid_until       TIMESTAMPTZ,
      source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
      confidence        REAL NOT NULL DEFAULT 1.0,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,

  sql`
    CREATE TABLE IF NOT EXISTS tkg_summaries (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      summary       TEXT NOT NULL,
      fact_count    INT NOT NULL DEFAULT 0,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,

  sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_tkg_entities_unique ON tkg_entities(character_id, user_id, lower(name))`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_tkg_summaries_unique ON tkg_summaries(character_id, user_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_tkg_edges_active ON tkg_edges(character_id, user_id) WHERE valid_until IS NULL`,
  sql`CREATE INDEX IF NOT EXISTS idx_tkg_edges_source ON tkg_edges(source_entity_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_tkg_edges_target ON tkg_edges(target_entity_id)`,
];

async function deploy() {
  console.log("🚀 Running production migrations...");

  for (const migration of migrations) {
    await db.execute(migration);
  }

  console.log(`✅ ${migrations.length} migration steps applied successfully.`);
}

deploy()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  });
