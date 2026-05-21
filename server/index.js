require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { db, initDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow the widget to be embedded on any restaurant's site
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : null;

app.use(cors({
  origin: allowedOrigins || true, // Allow all in dev, restrict in prod
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());

// Root → pitch page (must be before static middleware so index.html doesn't win)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'pitch.html')));

app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/api', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/site', require('./routes/site'));

// Clean URLs for static pages
app.get('/onboard', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'onboard.html')));
app.get('/pitch', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'pitch.html')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize DB and start server
async function start() {
  await initDb();

  // Seed the demo business (The Plateau Kitchen) on first run
  const existing = await db.execute({ sql: 'SELECT id FROM businesses WHERE slug = ?', args: ['plateau-kitchen'] });
  if (existing.rows.length === 0) {
    const promptPath = path.join(__dirname, 'prompts', 'plateau-kitchen.txt');
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    const id = require('crypto').randomUUID();
    await db.execute({
      sql: 'INSERT INTO businesses (id, name, slug, system_prompt, welcome_message, theme_color) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        id,
        'The Plateau Kitchen',
        'plateau-kitchen',
        systemPrompt,
        "Hi! 👋 Welcome to The Plateau Kitchen. I can help with our menu, hours, reservations, or anything else. What can I do for you?",
        '#059669'
      ]
    });
    console.log('  ✅ Demo business "The Plateau Kitchen" seeded');
  }

  app.listen(PORT, () => {
    console.log(`
  ┌──────────────────────────────────────────────┐
  │                                              │
  │   🏪 FrontDesk AI v0.1.0                     │
  │   AI chat for local businesses               │
  │                                              │
  │   Server:    http://localhost:${PORT}            │
  │   Demo:      http://localhost:${PORT}            │
  │   Admin:     http://localhost:${PORT}/admin.html  │
  │   Widget:    http://localhost:${PORT}/widget/     │
  │                                              │
  │   Demo business: The Plateau Kitchen         │
  │   Slug: plateau-kitchen                      │
  │                                              │
  └──────────────────────────────────────────────┘
    `);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
