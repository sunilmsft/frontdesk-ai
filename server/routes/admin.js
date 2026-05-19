const express = require('express');
const { db } = require('../db/database');
const { requireAuth, generateToken } = require('../middleware/auth');

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * POST /api/admin/login — Authenticate admin
 */
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not configured on server' });
  }

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = generateToken();
  res.json({ token });
});

/**
 * POST /api/admin/submissions — Save a new onboarding submission (PUBLIC — no auth)
 */
router.post('/submissions', async (req, res) => {
  const { business_name, form_data, system_prompt, welcome_message, theme_color } = req.body;

  if (!business_name || !form_data || !system_prompt) {
    return res.status(400).json({ error: 'business_name, form_data, and system_prompt are required' });
  }

  const id = require('crypto').randomUUID();
  await db.execute({
    sql: 'INSERT INTO submissions (id, business_name, form_data, system_prompt, welcome_message, theme_color) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, business_name, JSON.stringify(form_data), system_prompt, welcome_message || 'Hi! How can I help you today?', theme_color || '#0d9488']
  });

  res.status(201).json({ id, message: 'Submission received! We\'ll review and set up your assistant shortly.' });
});

// --- All routes below require authentication ---
router.use(requireAuth);

/**
 * GET /api/admin/stats — Dashboard stats across all businesses
 */
router.get('/stats', async (req, res) => {
  const [totalBiz, totalConv, totalMsg, todayConv, topQ, bizStats] = await Promise.all([
    db.execute('SELECT COUNT(*) as c FROM businesses WHERE active = 1'),
    db.execute('SELECT COUNT(*) as c FROM conversations'),
    db.execute('SELECT COUNT(*) as c FROM messages'),
    db.execute("SELECT COUNT(*) as c FROM conversations WHERE started_at >= date('now')"),
    db.execute("SELECT content, COUNT(*) as c FROM messages WHERE role = 'user' GROUP BY content ORDER BY c DESC LIMIT 10"),
    db.execute(`
      SELECT b.name, b.slug,
        (SELECT COUNT(*) FROM conversations WHERE business_id = b.id) as conversations,
        (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.business_id = b.id) as messages
      FROM businesses b WHERE b.active = 1
    `),
  ]);

  res.json({
    totalBusinesses: totalBiz.rows[0].c,
    totalConversations: totalConv.rows[0].c,
    totalMessages: totalMsg.rows[0].c,
    todayConversations: todayConv.rows[0].c,
    topQuestions: topQ.rows,
    businessStats: bizStats.rows,
  });
});

/**
 * GET /api/admin/businesses — List all businesses
 */
router.get('/businesses', async (req, res) => {
  const result = await db.execute('SELECT * FROM businesses ORDER BY created_at DESC');
  res.json(result.rows);
});

/**
 * POST /api/admin/businesses — Create a new business
 */
router.post('/businesses', async (req, res) => {
  const { name, slug, system_prompt, welcome_message, theme_color } = req.body;

  if (!name || !slug || !system_prompt) {
    return res.status(400).json({ error: 'name, slug, and system_prompt are required' });
  }

  // Sanitize slug
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

  const id = require('crypto').randomUUID();

  try {
    await db.execute({
      sql: 'INSERT INTO businesses (id, name, slug, system_prompt, welcome_message, theme_color) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, name, cleanSlug, system_prompt, welcome_message || 'Hi! How can I help you today?', theme_color || '#2563eb']
    });

    const result = await db.execute({ sql: 'SELECT * FROM businesses WHERE id = ?', args: [id] });
    res.status(201).json(result.rows[0]);
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
router.put('/businesses/:id', async (req, res) => {
  const { name, system_prompt, welcome_message, theme_color } = req.body;
  const bizResult = await db.execute({ sql: 'SELECT * FROM businesses WHERE id = ?', args: [req.params.id] });
  const business = bizResult.rows[0];

  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  await db.execute({
    sql: 'UPDATE businesses SET name = ?, system_prompt = ?, welcome_message = ?, theme_color = ? WHERE id = ?',
    args: [
      name || business.name,
      system_prompt || business.system_prompt,
      welcome_message || business.welcome_message,
      theme_color || business.theme_color,
      req.params.id
    ]
  });

  const updated = await db.execute({ sql: 'SELECT * FROM businesses WHERE id = ?', args: [req.params.id] });
  res.json(updated.rows[0]);
});

/**
 * GET /api/admin/conversations/:businessId — Recent conversations for a business
 */
router.get('/conversations/:businessId', async (req, res) => {
  const result = await db.execute({
    sql: `
      SELECT c.*,
        (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user' ORDER BY sent_at ASC LIMIT 1) as first_question
      FROM conversations c
      WHERE c.business_id = ?
      ORDER BY c.last_message_at DESC
      LIMIT 50
    `,
    args: [req.params.businessId]
  });

  res.json(result.rows);
});

/**
 * GET /api/admin/conversation/:id/messages — Full message thread
 */
router.get('/conversation/:id/messages', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY sent_at ASC',
    args: [req.params.id]
  });

  res.json(result.rows);
});

/**
 * GET /api/admin/submissions — List all submissions
 */
router.get('/submissions', async (req, res) => {
  const result = await db.execute('SELECT * FROM submissions ORDER BY submitted_at DESC');
  res.json(result.rows);
});

/**
 * POST /api/admin/submissions/:id/approve — Approve a submission and create the business
 * Body (optional overrides): { business_name, system_prompt, welcome_message, theme_color }
 */
router.post('/submissions/:id/approve', async (req, res) => {
  const subResult = await db.execute({ sql: 'SELECT * FROM submissions WHERE id = ?', args: [req.params.id] });
  const sub = subResult.rows[0];
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  if (sub.status === 'approved') return res.status(400).json({ error: 'Already approved' });

  // Allow overrides from the review form
  const bizName = req.body.business_name || sub.business_name;
  const sysPrompt = req.body.system_prompt || sub.system_prompt;
  const welcomeMsg = req.body.welcome_message || sub.welcome_message;
  const color = req.body.theme_color || sub.theme_color;

  const slug = bizName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const bizId = require('crypto').randomUUID();

  try {
    await db.execute({
      sql: 'INSERT INTO businesses (id, name, slug, system_prompt, welcome_message, theme_color) VALUES (?, ?, ?, ?, ?, ?)',
      args: [bizId, bizName, slug, sysPrompt, welcomeMsg, color]
    });

    await db.execute({ sql: "UPDATE submissions SET status = 'approved' WHERE id = ?", args: [req.params.id] });

    const bizResult = await db.execute({ sql: 'SELECT * FROM businesses WHERE id = ?', args: [bizId] });
    res.json({ business: bizResult.rows[0], message: 'Business created and live!' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'A business with that slug already exists' });
    }
    throw err;
  }
});

/**
 * POST /api/admin/submissions/:id/reject — Reject a submission
 */
router.post('/submissions/:id/reject', async (req, res) => {
  const subResult = await db.execute({ sql: 'SELECT * FROM submissions WHERE id = ?', args: [req.params.id] });
  const sub = subResult.rows[0];
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  if (sub.status !== 'pending') return res.status(400).json({ error: 'Can only reject pending submissions' });

  await db.execute({ sql: "UPDATE submissions SET status = 'rejected' WHERE id = ?", args: [req.params.id] });
  res.json({ message: 'Submission rejected' });
});

/**
 * DELETE /api/admin/submissions/:id — Permanently delete a submission
 */
router.delete('/submissions/:id', async (req, res) => {
  const subResult = await db.execute({ sql: 'SELECT * FROM submissions WHERE id = ?', args: [req.params.id] });
  if (!subResult.rows[0]) return res.status(404).json({ error: 'Submission not found' });

  await db.execute({ sql: 'DELETE FROM submissions WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'Submission deleted' });
});

module.exports = router;
