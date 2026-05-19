const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_URL || 'file:server/db/frontdesk.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      system_prompt TEXT NOT NULL,
      welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
      theme_color TEXT DEFAULT '#0d9488',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      started_at TEXT DEFAULT (datetime('now')),
      last_message_at TEXT DEFAULT (datetime('now')),
      message_count INTEGER DEFAULT 0,
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      sent_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations(business_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  `);

  // Add profile columns (safe migration — ignores if already exist)
  const migrationCols = [
    ['businesses', 'owner_name', 'TEXT'],
    ['businesses', 'phone', 'TEXT'],
    ['businesses', 'business_type', 'TEXT'],
    ['businesses', 'service_area', 'TEXT'],
    ['businesses', 'plan', "TEXT DEFAULT 'chat-only'"],
  ];
  for (const [table, col, type] of migrationCols) {
    try { await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch (_) {}
  }

  await db.executeMultiple(`

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      form_data TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      welcome_message TEXT,
      theme_color TEXT DEFAULT '#0d9488',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      submitted_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { db, initDb };
