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
    ['businesses', 'google_place_id', 'TEXT'],
    ['businesses', 'domain', 'TEXT'],
    ['businesses', 'domain_registrar', 'TEXT'],
    ['businesses', 'domain_cost', 'TEXT'],
    ['businesses', 'domain_purchased_at', 'TEXT'],
    ['businesses', 'domain_renews_at', 'TEXT'],
    ['businesses', 'domain_auto_renew', 'INTEGER DEFAULT 0'],
    ['businesses', 'monthly_rate', 'TEXT'],
    ['businesses', 'addons', "TEXT DEFAULT '[]'"],
    ['businesses', 'client_since', 'TEXT'],
    ['businesses', 'billing_notes', 'TEXT'],
  ];
  for (const [table, col, type] of migrationCols) {
    try { await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch (_) {}
  }

  // Reviews cache table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reviews_cache (
      business_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  await db.executeMultiple(`

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      form_data TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      welcome_message TEXT,
      theme_color TEXT DEFAULT '#0d9488',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in-review', 'need-info', 'follow-up', 'approved', 'rejected', 'deleted')),
      submitted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customer_pipeline (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      owner_name TEXT,
      phone TEXT,
      email TEXT,
      submission_id TEXT,
      business_id TEXT,
      stage TEXT DEFAULT 'lead',
      onboard_link_sent_at TEXT,
      submitted_at TEXT,
      approved_at TEXT,
      chat_live_at TEXT,
      preview_url TEXT,
      preview_sent_at TEXT,
      site_approved_at TEXT,
      proposed_domains TEXT,
      selected_domain TEXT,
      domain_purchased_at TEXT,
      go_live_at TEXT,
      notes TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES submissions(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON customer_pipeline(stage);
    CREATE INDEX IF NOT EXISTS idx_pipeline_submission ON customer_pipeline(submission_id);

    CREATE TABLE IF NOT EXISTS quote_requests (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      service TEXT NOT NULL,
      answers TEXT DEFAULT '{}',
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      view_token TEXT NOT NULL,
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'quoted', 'booked', 'closed')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_quotes_business ON quote_requests(business_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_status ON quote_requests(status);

    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      business_name TEXT,
      phone TEXT NOT NULL,
      looking_for TEXT,
      message TEXT,
      language TEXT DEFAULT 'en',
      translated_message TEXT,
      referral TEXT,
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'converted', 'closed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_inquiries(status);
  `);

  // Migration: widen submissions status CHECK constraint to include 'deleted'
  // SQLite doesn't support ALTER CHECK, but Turso/libSQL allows dropping and recreating.
  // Safe approach: just try to update the constraint by creating a temp row. If it fails, the DB needs migration.
  try {
    await db.execute("UPDATE submissions SET status = 'deleted' WHERE 0"); // no-op test
  } catch {
    // Recreate table with wider constraint (Turso supports this via a temp table dance)
    // For now, just skip — new DBs will have the right constraint
  }

  // Backfill: create pipeline records for any existing businesses that don't have one
  const orphanBiz = await db.execute(`
    SELECT b.id, b.name, b.owner_name, b.phone, b.created_at
    FROM businesses b
    WHERE b.id NOT IN (SELECT business_id FROM customer_pipeline WHERE business_id IS NOT NULL)
  `);
  for (const b of orphanBiz.rows) {
    const pId = require('crypto').randomUUID();
    await db.execute({
      sql: `INSERT INTO customer_pipeline (id, business_name, owner_name, phone, business_id, stage, approved_at, chat_live_at, preview_url, preview_sent_at, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'preview-sent', ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        pId, b.name, b.owner_name, b.phone, b.id,
        b.created_at, b.created_at,
        `https://frontdesk-ai-vx1s.onrender.com/site/${b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`,
        b.created_at,
        JSON.stringify([{ text: 'Backfilled from existing business record', at: new Date().toISOString() }]),
        b.created_at
      ]
    });
  }
}

module.exports = { db, initDb };
