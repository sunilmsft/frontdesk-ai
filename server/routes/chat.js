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

module.exports = router;
