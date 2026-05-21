const express = require('express');
const OpenAI = require('openai');
const { db } = require('../db/database');
const { requireAuth, generateToken } = require('../middleware/auth');

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple in-memory rate limiter for public endpoints
const rateLimitMap = new Map();
function rateLimit(windowMs, maxRequests) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (entry && now - entry.start < windowMs) {
      if (entry.count >= maxRequests) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }
      entry.count++;
    } else {
      rateLimitMap.set(ip, { start: now, count: 1 });
    }
    next();
  };
}
// Clean up stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.start > 3600000) rateLimitMap.delete(ip);
  }
}, 600000);

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
 * POST /api/admin/submissions — Save a new onboarding submission (PUBLIC — no auth, rate limited)
 */
router.post('/submissions', rateLimit(3600000, 5), async (req, res) => {
  const { business_name, form_data, system_prompt, welcome_message, theme_color } = req.body;

  if (!business_name || !form_data || !system_prompt) {
    return res.status(400).json({ error: 'business_name, form_data, and system_prompt are required' });
  }

  const id = require('crypto').randomUUID();
  const now = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO submissions (id, business_name, form_data, system_prompt, welcome_message, theme_color) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, business_name, JSON.stringify(form_data), system_prompt, welcome_message || 'Hi! How can I help you today?', theme_color || '#0d9488']
  });

  // Auto-create pipeline record
  const pipelineId = require('crypto').randomUUID();
  const ownerName = form_data.ownerName || null;
  const phone = form_data.phone || null;
  await db.execute({
    sql: `INSERT INTO customer_pipeline (id, business_name, owner_name, phone, submission_id, stage, submitted_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
    args: [pipelineId, business_name, ownerName, phone, id, now, now, now]
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
  const { name, system_prompt, welcome_message, theme_color, owner_name, phone, business_type, service_area, plan, google_place_id,
          domain, domain_registrar, domain_cost, domain_purchased_at, domain_renews_at, domain_auto_renew, monthly_rate, addons, client_since, billing_notes } = req.body;
  const bizResult = await db.execute({ sql: 'SELECT * FROM businesses WHERE id = ?', args: [req.params.id] });
  const business = bizResult.rows[0];

  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  await db.execute({
    sql: `UPDATE businesses SET name = ?, system_prompt = ?, welcome_message = ?, theme_color = ?,
          owner_name = ?, phone = ?, business_type = ?, service_area = ?, plan = ?, google_place_id = ?,
          domain = ?, domain_registrar = ?, domain_cost = ?, domain_purchased_at = ?, domain_renews_at = ?,
          domain_auto_renew = ?, monthly_rate = ?, addons = ?, client_since = ?, billing_notes = ? WHERE id = ?`,
    args: [
      name || business.name,
      system_prompt || business.system_prompt,
      welcome_message || business.welcome_message,
      theme_color || business.theme_color,
      owner_name !== undefined ? owner_name : business.owner_name,
      phone !== undefined ? phone : business.phone,
      business_type !== undefined ? business_type : business.business_type,
      service_area !== undefined ? service_area : business.service_area,
      plan !== undefined ? plan : business.plan,
      google_place_id !== undefined ? google_place_id : business.google_place_id,
      domain !== undefined ? domain : business.domain,
      domain_registrar !== undefined ? domain_registrar : business.domain_registrar,
      domain_cost !== undefined ? domain_cost : business.domain_cost,
      domain_purchased_at !== undefined ? domain_purchased_at : business.domain_purchased_at,
      domain_renews_at !== undefined ? domain_renews_at : business.domain_renews_at,
      domain_auto_renew !== undefined ? (domain_auto_renew ? 1 : 0) : business.domain_auto_renew,
      monthly_rate !== undefined ? monthly_rate : business.monthly_rate,
      addons !== undefined ? (typeof addons === 'string' ? addons : JSON.stringify(addons)) : business.addons,
      client_since !== undefined ? client_since : business.client_since,
      billing_notes !== undefined ? billing_notes : business.billing_notes,
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

  // Extract profile fields from form_data
  const formData = JSON.parse(sub.form_data);
  const ownerName = formData.ownerName || null;
  const phone = formData.phone || null;
  const businessType = formData.type || null;
  const serviceArea = formData.serviceArea || null;

  const slug = bizName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const bizId = require('crypto').randomUUID();

  try {
    // Look up Google Place ID if business provided a Google Business name
    let googlePlaceId = null;
    const googleBizName = formData.googleBusinessName;
    if (googleBizName && process.env.GOOGLE_PLACES_API_KEY) {
      try {
        // Prefer address (most specific), then phone, then service area
        const address = formData.address || '';
        const searchQuery = address ? `${googleBizName} ${address}` : (phone ? `${googleBizName} ${phone}` : (serviceArea ? `${googleBizName} ${serviceArea}` : googleBizName));
        const searchResp = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName'
          },
          body: JSON.stringify({ textQuery: searchQuery })
        });
        if (searchResp.ok) {
          const searchData = await searchResp.json();
          if (searchData.places && searchData.places.length > 0) {
            googlePlaceId = searchData.places[0].id;
          }
        }
      } catch (e) {
        console.error('Google Place ID lookup failed:', e.message);
      }
    }

    await db.execute({
      sql: 'INSERT INTO businesses (id, name, slug, system_prompt, welcome_message, theme_color, owner_name, phone, business_type, service_area, google_place_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [bizId, bizName, slug, sysPrompt, welcomeMsg, color, ownerName, phone, businessType, serviceArea, googlePlaceId]
    });

    await db.execute({ sql: "UPDATE submissions SET status = 'approved' WHERE id = ?", args: [req.params.id] });

    // Auto-update pipeline record
    const pipelineRec = await db.execute({ sql: 'SELECT id FROM customer_pipeline WHERE submission_id = ?', args: [req.params.id] });
    if (pipelineRec.rows[0]) {
      const approvedAt = new Date().toISOString();
      await db.execute({
        sql: "UPDATE customer_pipeline SET stage = 'chat-live', business_id = ?, approved_at = ?, chat_live_at = ?, business_name = ?, owner_name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?",
        args: [bizId, approvedAt, approvedAt, bizName, ownerName, phone, pipelineRec.rows[0].id]
      });
    }

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
 * DELETE /api/admin/submissions/:id — Soft-delete a submission (moves to trash)
 */
router.delete('/submissions/:id', async (req, res) => {
  const subResult = await db.execute({ sql: 'SELECT * FROM submissions WHERE id = ?', args: [req.params.id] });
  if (!subResult.rows[0]) return res.status(404).json({ error: 'Submission not found' });

  await db.execute({ sql: "UPDATE submissions SET status = 'deleted' WHERE id = ?", args: [req.params.id] });
  res.json({ message: 'Submission moved to trash' });
});

/**
 * POST /api/admin/submissions/:id/restore — Restore a deleted submission back to pending
 */
router.post('/submissions/:id/restore', async (req, res) => {
  const subResult = await db.execute({ sql: 'SELECT * FROM submissions WHERE id = ?', args: [req.params.id] });
  if (!subResult.rows[0]) return res.status(404).json({ error: 'Submission not found' });

  await db.execute({ sql: "UPDATE submissions SET status = 'pending' WHERE id = ?", args: [req.params.id] });
  res.json({ message: 'Submission restored' });
});

/**
 * PUT /api/admin/submissions/:id — Update form data on a pending submission
 */
router.put('/submissions/:id', async (req, res) => {
  const subResult = await db.execute({ sql: 'SELECT * FROM submissions WHERE id = ?', args: [req.params.id] });
  const sub = subResult.rows[0];
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const { form_data, system_prompt, welcome_message, theme_color, business_name, status } = req.body;
  const updates = [];
  const args = [];

  if (form_data !== undefined) { updates.push('form_data = ?'); args.push(JSON.stringify(form_data)); }
  if (system_prompt !== undefined) { updates.push('system_prompt = ?'); args.push(system_prompt); }
  if (welcome_message !== undefined) { updates.push('welcome_message = ?'); args.push(welcome_message); }
  if (theme_color !== undefined) { updates.push('theme_color = ?'); args.push(theme_color); }
  if (business_name !== undefined) { updates.push('business_name = ?'); args.push(business_name); }
  if (status !== undefined) {
    const validStatuses = ['pending', 'in-review', 'need-info', 'follow-up', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    updates.push('status = ?'); args.push(status);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  args.push(req.params.id);

  await db.execute({ sql: `UPDATE submissions SET ${updates.join(', ')} WHERE id = ?`, args });
  const updated = await db.execute({ sql: 'SELECT * FROM submissions WHERE id = ?', args: [req.params.id] });
  res.json(updated.rows[0]);
});

// ============================================================
// AI-Assisted Review
// ============================================================

/**
 * POST /api/admin/ai/enhance — Improve a single form field using AI
 * Body: { field, value, businessName, businessType }
 */
router.post('/ai/enhance', async (req, res) => {
  const { field, value, businessName, businessType } = req.body;
  if (!field || !value) return res.status(400).json({ error: 'field and value are required' });

  const fieldInstructions = {
    offerings: 'Rewrite this as a clear, professional list of services/offerings. Keep it factual — don\'t invent services not mentioned. Organize into bullet points if appropriate.',
    hours: 'Format these operating hours clearly and consistently. Use standard format like "Monday – Friday: 8:00 AM – 5:00 PM". Don\'t invent hours not mentioned.',
    about: 'Polish this about section to sound warm and professional. Keep the personal voice — this should feel authentic, not corporate. Preserve all facts.',
    policies: 'Rewrite these policies to be clear and professional. Keep the same rules, just improve clarity.',
    reservations: 'Improve this booking/reservation info to be clear and professional.',
    serviceArea: 'Format this service area description clearly. If it\'s a list of cities/neighborhoods, organize them well.',
    tone: 'Expand this tone description into a 1-2 sentence personality guide for the AI assistant. E.g., "friendly" → "Warm and approachable — like chatting with a trusted neighbor. Uses casual but professional language."',
  };

  const instruction = fieldInstructions[field] || 'Improve this text to be more clear and professional. Keep all factual content.';
  const context = businessName ? `This is for "${businessName}"${businessType ? `, a ${businessType}` : ''}.` : '';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are a business copywriter helping set up a small local business profile. ${context} Only return the improved text — no explanations, no markdown headers, no quotes.` },
        { role: 'user', content: `${instruction}\n\nOriginal:\n${value}` }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    res.json({ enhanced: completion.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: 'AI enhancement failed: ' + err.message });
  }
});

/**
 * POST /api/admin/ai/generate-prompt — Generate system prompt from form data (server-side)
 * Body: { form_data }
 */
router.post('/ai/generate-prompt', async (req, res) => {
  const data = req.body.form_data;
  if (!data || !data.name) return res.status(400).json({ error: 'form_data with at least a name is required' });

  // Build prompt deterministically (same logic as client but server-side + cleaner)
  let prompt = `You are a helpful, ${data.tone || 'friendly'} virtual assistant for ${data.name}`;
  if (data.type === 'other' && data.otherType) {
    prompt += `, a local ${data.otherType}`;
  } else if (data.type && data.type !== 'other') {
    const labels = { restaurant: 'restaurant', salon: 'salon', home_services: 'home services business', retail: 'shop', fitness: 'fitness studio', professional: 'business' };
    prompt += `, a local ${labels[data.type] || data.type}`;
  }
  if (data.address) prompt += ` located at ${data.address}`;
  prompt += '.\n\n';

  prompt += 'Your job is to answer customer questions accurately based on the information below. ';
  prompt += 'Be concise but helpful. If you don\'t know the answer, suggest the customer call or visit the website.\n\n';

  const contact = [];
  if (data.phone) contact.push(`Phone: ${data.phone}`);
  if (data.email) contact.push(`Email: ${data.email}`);
  if (data.website) contact.push(`Website: ${data.website}`);
  if (data.address) contact.push(`Address: ${data.address}`);
  if (contact.length) prompt += '## Contact Information\n' + contact.join('\n') + '\n\n';

  if (data.serviceArea) prompt += `## Areas Serviced\n${data.serviceArea}\n\n`;
  if (data.hours) prompt += `## Hours of Operation\n${data.hours}\n\n`;
  if (data.offerings) {
    const label = data.type === 'restaurant' ? 'Menu' : 'Services & Offerings';
    prompt += `## ${label}\n${data.offerings}\n\n`;
  }
  if (data.reservations) prompt += `## Reservations / Booking\n${data.reservations}\n\n`;
  if (data.policies) prompt += `## Policies\n${data.policies}\n\n`;
  if (data.about) prompt += `## About the Owner\n${data.about}\n\n`;

  prompt += '## Important Rules\n';
  prompt += '- Only answer based on the information provided above.\n';
  prompt += '- Do not make up information about menu items, prices, or services.\n';
  prompt += '- Keep responses concise — 2-3 sentences when possible.\n';
  prompt += '- If asked about something not covered above, say "I\'m not sure about that — please call us or check our website for details."\n';
  prompt += `- Always be ${data.tone || 'friendly'} in your responses.\n`;
  prompt += '- IMPORTANT: Always respond in the same language the customer uses.\n';

  res.json({ system_prompt: prompt });
});

// ============================================================
// Customer Pipeline
// ============================================================

/**
 * GET /api/admin/pipeline — List all pipeline records
 */
router.get('/pipeline', async (req, res) => {
  const result = await db.execute(`
    SELECT p.*, b.slug, b.active as biz_active
    FROM customer_pipeline p
    LEFT JOIN businesses b ON p.business_id = b.id
    ORDER BY p.updated_at DESC
  `);
  res.json(result.rows);
});

/**
 * POST /api/admin/pipeline — Create a pipeline record manually (for leads you haven't sent the form to yet)
 */
router.post('/pipeline', async (req, res) => {
  const { business_name, owner_name, phone, email, notes } = req.body;
  if (!business_name) return res.status(400).json({ error: 'business_name is required' });

  const id = require('crypto').randomUUID();
  const now = new Date().toISOString();
  const noteEntry = notes ? JSON.stringify([{ text: notes, at: now }]) : '[]';

  await db.execute({
    sql: `INSERT INTO customer_pipeline (id, business_name, owner_name, phone, email, stage, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'lead', ?, ?, ?)`,
    args: [id, business_name, owner_name || null, phone || null, email || null, noteEntry, now, now]
  });

  const result = await db.execute({ sql: 'SELECT * FROM customer_pipeline WHERE id = ?', args: [id] });
  res.status(201).json(result.rows[0]);
});

/**
 * PUT /api/admin/pipeline/:id — Update a pipeline record
 */
router.put('/pipeline/:id', async (req, res) => {
  const existing = await db.execute({ sql: 'SELECT * FROM customer_pipeline WHERE id = ?', args: [req.params.id] });
  const rec = existing.rows[0];
  if (!rec) return res.status(404).json({ error: 'Pipeline record not found' });

  const fields = ['business_name', 'owner_name', 'phone', 'email', 'stage',
    'onboard_link_sent_at', 'submitted_at', 'approved_at', 'chat_live_at',
    'preview_url', 'preview_sent_at', 'site_approved_at',
    'proposed_domains', 'selected_domain', 'domain_purchased_at', 'go_live_at',
    'submission_id', 'business_id'];

  const updates = [];
  const args = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      args.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  updates.push("updated_at = datetime('now')");
  args.push(req.params.id);

  await db.execute({
    sql: `UPDATE customer_pipeline SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  const updated = await db.execute({ sql: 'SELECT * FROM customer_pipeline WHERE id = ?', args: [req.params.id] });
  res.json(updated.rows[0]);
});

/**
 * POST /api/admin/pipeline/:id/note — Add a timestamped note
 */
router.post('/pipeline/:id/note', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const existing = await db.execute({ sql: 'SELECT * FROM customer_pipeline WHERE id = ?', args: [req.params.id] });
  const rec = existing.rows[0];
  if (!rec) return res.status(404).json({ error: 'Pipeline record not found' });

  const notes = JSON.parse(rec.notes || '[]');
  notes.push({ text, at: new Date().toISOString() });

  await db.execute({
    sql: "UPDATE customer_pipeline SET notes = ?, updated_at = datetime('now') WHERE id = ?",
    args: [JSON.stringify(notes), req.params.id]
  });

  const updated = await db.execute({ sql: 'SELECT * FROM customer_pipeline WHERE id = ?', args: [req.params.id] });
  res.json(updated.rows[0]);
});

/**
 * DELETE /api/admin/pipeline/:id — Remove a pipeline record
 */
router.delete('/pipeline/:id', async (req, res) => {
  const existing = await db.execute({ sql: 'SELECT * FROM customer_pipeline WHERE id = ?', args: [req.params.id] });
  if (!existing.rows[0]) return res.status(404).json({ error: 'Pipeline record not found' });

  await db.execute({ sql: 'DELETE FROM customer_pipeline WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'Pipeline record deleted' });
});

// ============================================================
// Google Places Search (for Place ID lookup)
// ============================================================

/**
 * GET /api/admin/places/search?q=... — Search Google Places and return candidates
 * Used by admin UI to find and verify the correct Google Place ID for a business
 */
router.get('/places/search', async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Search query (q) is required (min 2 chars)' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Google Places API key not configured' });
  }

  try {
    const searchResp = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri'
      },
      body: JSON.stringify({ textQuery: query.trim(), maxResultCount: 5 })
    });

    if (!searchResp.ok) {
      const errText = await searchResp.text();
      console.error('Google Places search error:', searchResp.status, errText);
      return res.status(502).json({ error: 'Google Places API error' });
    }

    const data = await searchResp.json();
    const results = (data.places || []).map(p => ({
      placeId: p.id,
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      rating: p.rating || null,
      totalReviews: p.userRatingCount || 0,
      googleMapsUrl: p.googleMapsUri || null,
    }));

    res.json({ results });
  } catch (err) {
    console.error('Google Places search failed:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * POST /api/admin/reviews/clear-cache/:businessId — Clear cached reviews for a business
 * Used when changing the Place ID so fresh reviews load immediately
 */
router.post('/reviews/clear-cache/:businessId', async (req, res) => {
  await db.execute({
    sql: 'DELETE FROM reviews_cache WHERE business_id = ?',
    args: [req.params.businessId]
  });
  res.json({ message: 'Reviews cache cleared' });
});

module.exports = router;
