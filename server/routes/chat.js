const express = require('express');
const OpenAI = require('openai');
const db = require('../db/database');
const crypto = require('crypto');

const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/chat — Handle a customer message
 * Body: { businessId, conversationId?, message }
 * Returns: { conversationId, reply }
 */
router.post('/chat', async (req, res) => {
  const { businessId, conversationId, message } = req.body;

  if (!businessId || !message) {
    return res.status(400).json({ error: 'businessId and message are required' });
  }

  // Validate message length to prevent abuse
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
  }

  // Look up the business
  const business = db.prepare('SELECT * FROM businesses WHERE id = ? AND active = 1').get(businessId);
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    convId = crypto.randomUUID();
    db.prepare('INSERT INTO conversations (id, business_id) VALUES (?, ?)').run(convId, businessId);
  }

  // Log the user message
  db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
    .run(convId, 'user', message);

  // Get conversation history (last 20 messages for context)
  const history = db.prepare(
    'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY sent_at ASC LIMIT 20'
  ).all(convId);

  // Build OpenAI messages array
  // Inject current date so the AI knows what day it is
  const now = new Date();
  const dateContext = `\n\nCurrent date and time: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`;

  const openaiMessages = [
    { role: 'system', content: business.system_prompt + dateContext },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: openaiMessages,
    });

    const reply = response.choices[0].message.content;

    // Log the assistant reply
    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
      .run(convId, 'assistant', reply);

    // Update conversation stats
    db.prepare(
      'UPDATE conversations SET message_count = message_count + 2, last_message_at = datetime(\'now\') WHERE id = ?'
    ).run(convId);

    res.json({ conversationId: convId, reply });
  } catch (err) {
    console.error('OpenAI API error:', err.message);
    res.status(500).json({
      error: 'Sorry, I\'m having trouble right now. Please call us directly!',
    });
  }
});

/**
 * GET /api/business/:slug — Get business info for the widget
 */
router.get('/business/:slug', (req, res) => {
  const business = db.prepare(
    'SELECT id, name, slug, welcome_message, theme_color FROM businesses WHERE slug = ? AND active = 1'
  ).get(req.params.slug);

  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  res.json(business);
});

/**
 * GET /api/detect-color?url=... — Try to detect the brand color from a website
 */
router.get('/detect-color', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });

  try {
    // Validate URL format
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FrontDesk-AI-Bot/1.0' },
    });
    clearTimeout(timeout);

    const html = await response.text();

    // Try to find brand color from common patterns
    let color = null;

    // 1. theme-color meta tag
    const themeMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["'](#[0-9a-fA-F]{3,8})["']/i)
      || html.match(/<meta[^>]*content=["'](#[0-9a-fA-F]{3,8})["'][^>]*name=["']theme-color["']/i);
    if (themeMatch) color = themeMatch[1];

    // 2. msapplication-TileColor
    if (!color) {
      const tileMatch = html.match(/<meta[^>]*name=["']msapplication-TileColor["'][^>]*content=["'](#[0-9a-fA-F]{3,8})["']/i)
        || html.match(/<meta[^>]*content=["'](#[0-9a-fA-F]{3,8})["'][^>]*name=["']msapplication-TileColor["']/i);
      if (tileMatch) color = tileMatch[1];
    }

    // 3. Most common hex color in inline styles (skip black/white/grays)
    if (!color) {
      const hexColors = html.match(/#[0-9a-fA-F]{6}/g) || [];
      const counts = {};
      hexColors.forEach(c => {
        const lower = c.toLowerCase();
        // Skip near-black, near-white, and pure grays
        if (['#000000', '#ffffff', '#fff', '#333333', '#666666', '#999999', '#cccccc', '#f5f5f5', '#eeeeee', '#e5e5e5', '#dddddd'].includes(lower)) return;
        const r = parseInt(lower.slice(1,3), 16);
        const g = parseInt(lower.slice(3,5), 16);
        const b = parseInt(lower.slice(5,7), 16);
        if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10) return; // skip grays
        counts[lower] = (counts[lower] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) color = sorted[0][0];
    }

    res.json({ color: color || null });
  } catch (err) {
    res.json({ color: null });
  }
});

module.exports = router;
