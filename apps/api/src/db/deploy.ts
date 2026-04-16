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
