const express = require('express');
const db = require('../db/database');

const router = express.Router();

/**
 * GET /api/admin/stats — Dashboard stats across all businesses
 */
router.get('/stats', (req, res) => {
  const stats = {
    totalBusinesses: db.prepare('SELECT COUNT(*) as c FROM businesses WHERE active = 1').get().c,
    totalConversations: db.prepare('SELECT COUNT(*) as c FROM conversations').get().c,
    totalMessages: db.prepare('SELECT COUNT(*) as c FROM messages').get().c,
    todayConversations: db.prepare(
      "SELECT COUNT(*) as c FROM conversations WHERE started_at >= date('now')"
    ).get().c,
    topQuestions: db.prepare(
      "SELECT content, COUNT(*) as c FROM messages WHERE role = 'user' GROUP BY content ORDER BY c DESC LIMIT 10"
    ).all(),
    businessStats: db.prepare(`
      SELECT b.name, b.slug,
        (SELECT COUNT(*) FROM conversations WHERE business_id = b.id) as conversations,
        (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.business_id = b.id) as messages
      FROM businesses b WHERE b.active = 1
    `).all(),
  };

  res.json(stats);
});

/**
 * GET /api/admin/businesses — List all businesses
 */
router.get('/businesses', (req, res) => {
  const businesses = db.prepare('SELECT * FROM businesses ORDER BY created_at DESC').all();
  res.json(businesses);
});

/**
 * POST /api/admin/businesses — Create a new business
 */
router.post('/businesses', (req, res) => {
  const { name, slug, system_prompt, welcome_message, theme_color } = req.body;

  if (!name || !slug || !system_prompt) {
    return res.status(400).json({ error: 'name, slug, and system_prompt are required' });
  }

  // Sanitize slug
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

  const id = require('crypto').randomUUID();

  try {
    db.prepare(
      'INSERT INTO businesses (id, name, slug, system_prompt, welcome_message, theme_color) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, cleanSlug, system_prompt, welcome_message || 'Hi! How can I help you today?', theme_color || '#2563eb');

    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    res.status(201).json(business);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'A business with that slug already exists' });
    }
    throw err;
  }
});

/**
 * PUT /api/admin/businesses/:id — Update a business
 */
router.put('/businesses/:id', (req, res) => {
  const { name, system_prompt, welcome_message, theme_color } = req.body;
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);

  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  db.prepare(
    'UPDATE businesses SET name = ?, system_prompt = ?, welcome_message = ?, theme_color = ? WHERE id = ?'
  ).run(
    name || business.name,
    system_prompt || business.system_prompt,
    welcome_message || business.welcome_message,
    theme_color || business.theme_color,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
  res.json(updated);
});

/**
 * GET /api/admin/conversations/:businessId — Recent conversations for a business
 */
router.get('/conversations/:businessId', (req, res) => {
  const conversations = db.prepare(`
    SELECT c.*,
      (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user' ORDER BY sent_at ASC LIMIT 1) as first_question
    FROM conversations c
    WHERE c.business_id = ?
    ORDER BY c.last_message_at DESC
    LIMIT 50
  `).all(req.params.businessId);

  res.json(conversations);
});

/**
 * GET /api/admin/conversation/:id/messages — Full message thread
 */
router.get('/conversation/:id/messages', (req, res) => {
  const messages = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY sent_at ASC'
  ).all(req.params.id);

  res.json(messages);
});

module.exports = router;
