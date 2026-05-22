const express = require('express');
const crypto = require('crypto');
const { db } = require('../db/database');

const router = express.Router();

// Email notification via Resend (free tier, no npm needed — just fetch)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL; // fallback for all businesses
if (RESEND_API_KEY) {
  console.log('  📧 Email notifications enabled for quote requests');
}

async function sendQuoteEmail({ to, businessName, ownerName, service, customerName, customerPhone, customerEmail, answers, viewLink }) {
  if (!RESEND_API_KEY || !to) return;

  // Build answers section
  let answersHtml = '';
  for (const [key, val] of Object.entries(answers || {})) {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    answersHtml += `<tr><td style="color:#888;padding:6px 12px 6px 0;font-size:14px">${label}</td><td style="font-weight:600;padding:6px 0;font-size:14px">${val}</td></tr>`;
  }

  const html = `
<div style="font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:0 auto">
  <div style="background:#1c1c1c;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#c4b5a0;margin-bottom:4px">New Quote Request</div>
    <div style="font-size:22px;font-weight:700">${service}</div>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="color:#888;padding:6px 12px 6px 0;font-size:14px">Customer</td><td style="font-weight:600;padding:6px 0;font-size:14px">${customerName}</td></tr>
      <tr><td style="color:#888;padding:6px 12px 6px 0;font-size:14px">Phone</td><td style="font-weight:600;padding:6px 0;font-size:14px"><a href="tel:${customerPhone}" style="color:#1c1c1c">${customerPhone}</a></td></tr>
      ${customerEmail ? `<tr><td style="color:#888;padding:6px 12px 6px 0;font-size:14px">Email</td><td style="font-weight:600;padding:6px 0;font-size:14px">${customerEmail}</td></tr>` : ''}
      ${answersHtml}
    </table>
    <div style="margin-top:20px;display:flex;gap:10px">
      <a href="tel:${customerPhone}" style="display:inline-block;background:#c4b5a0;color:#1c1c1c;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">📞 Call Back</a>
      <a href="sms:${customerPhone}" style="display:inline-block;background:#1c1c1c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">💬 Text Back</a>
    </div>
    ${viewLink ? `<p style="margin-top:16px;font-size:12px;color:#888"><a href="${viewLink}" style="color:#888">View full details</a></p>` : ''}
  </div>
  <p style="text-align:center;font-size:11px;color:#aaa;margin-top:12px">Sent by WelcomeMat on behalf of ${businessName}</p>
</div>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${businessName} via WelcomeMat <onboarding@resend.dev>`,
        to: [to],
        subject: `📋 New quote: ${service} — ${customerName}`,
        html
      })
    });
    if (resp.ok) {
      console.log(`  📧 Email sent to ${to} for quote from ${customerName}`);
    } else {
      const err = await resp.text();
      console.error('  ⚠️ Email send failed:', err);
    }
  } catch (err) {
    console.error('  ⚠️ Email error:', err.message);
  }
}

/**
 * POST /api/quote — Submit a quote request
 * Body: { businessSlug, service, answers, customerName, customerPhone, customerEmail? }
 */
router.post('/', async (req, res) => {
  try {
    const { businessSlug, service, answers, customerName, customerPhone, customerEmail } = req.body;

    if (!businessSlug || !service || !customerName || !customerPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate phone — at least 10 digits (US numbers)
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return res.status(400).json({ error: `Phone number needs 10 digits — you entered ${phoneDigits.length}. Double-check?` });
    }

    // Look up business
    const bizResult = await db.execute({
      sql: 'SELECT id, name, phone, owner_name FROM businesses WHERE slug = ?',
      args: [businessSlug]
    });
    if (bizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const business = bizResult.rows[0];

    const id = crypto.randomUUID();
    const viewToken = crypto.randomBytes(16).toString('hex');

    await db.execute({
      sql: `INSERT INTO quote_requests (id, business_id, service, answers, customer_name, customer_phone, customer_email, view_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, business.id, service, JSON.stringify(answers || {}), customerName, customerPhone, customerEmail || null, viewToken]
    });

    // Send email notification
    const baseUrl = process.env.BASE_URL || 'https://welcomematdigital.com';
    const viewLink = `${baseUrl}/quote/${id}?t=${viewToken}`;
    const notifyEmail = NOTIFICATION_EMAIL; // For now, notify admin. Later: per-business owner email.
    await sendQuoteEmail({
      to: notifyEmail,
      businessName: business.name,
      ownerName: business.owner_name,
      service,
      customerName,
      customerPhone,
      customerEmail,
      answers: answers || {},
      viewLink
    });

    res.json({ success: true, id });
  } catch (err) {
    console.error('Quote submission error:', err);
    res.status(500).json({ error: 'Failed to submit quote request' });
  }
});

/**
 * PATCH /api/quote/:id/status — Update quote status (token-protected)
 * Body: { status: 'contacted'|'quoted'|'booked'|'closed' }
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.query.t;
    const { status } = req.body;

    if (!token) return res.status(403).json({ error: 'Access denied' });

    const allowed = ['new', 'contacted', 'quoted', 'booked', 'closed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.execute({
      sql: 'UPDATE quote_requests SET status = ? WHERE id = ? AND view_token = ?',
      args: [status, id, token]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json({ success: true, status });
  } catch (err) {
    console.error('Quote status update error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * GET /quote/:id?t=<viewToken> — View quote details (token-protected, no login needed)
 * Renders a simple mobile-friendly page for the business owner
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.query.t;

    if (!token) return res.status(403).send('Access denied');

    const result = await db.execute({
      sql: `SELECT q.*, b.name as business_name, b.owner_name
            FROM quote_requests q
            JOIN businesses b ON q.business_id = b.id
            WHERE q.id = ? AND q.view_token = ?`,
      args: [id, token]
    });

    if (result.rows.length === 0) {
      return res.status(404).send('Quote not found');
    }

    const q = result.rows[0];
    const answers = JSON.parse(q.answers || '{}');
    const status = q.status || 'new';
    const created = new Date(q.created_at).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    // Status config
    const statusMap = {
      new:       { label: 'Needs Response', color: '#e8a735', bg: '#fef6e4' },
      contacted: { label: 'Contacted',      color: '#2d8a4e', bg: '#e6f4ea' },
      quoted:    { label: 'Quote Sent',     color: '#1a73e8', bg: '#e8f0fe' },
      booked:    { label: 'Booked',         color: '#1b7d3a', bg: '#d4edda' },
      closed:    { label: 'Closed',         color: '#888',    bg: '#f0f0f0' }
    };
    const s = statusMap[status] || statusMap.new;

    // Build answers HTML
    let answersHtml = '';
    for (const [key, val] of Object.entries(answers)) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      answersHtml += `<div style="padding:12px 0;border-bottom:1px solid #eee"><span style="color:#888;font-size:13px">${escapeHtml(label)}</span><br><strong>${escapeHtml(String(val))}</strong></div>`;
    }

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Request — ${escapeHtml(q.service)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,system-ui,sans-serif;background:#f5f5f3;color:#1b1b1b;padding:16px}
    .card{max-width:480px;margin:20px auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
    h1{font-size:20px;margin:12px 0 4px}
    .time{color:#888;font-size:13px;margin-bottom:20px}
    .status-badge{display:inline-block;font-size:12px;font-weight:700;padding:5px 14px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px}
    .contact{margin-top:20px;display:flex;gap:10px}
    .contact a{flex:1;text-align:center;padding:12px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;transition:transform 0.15s}
    .contact a:hover{transform:translateY(-1px)}
    .btn-call{background:#c4b5a0;color:#1b1b1b}
    .btn-text{background:#1c1c1c;color:#fff}
    .status-actions{margin-top:16px;display:flex;flex-wrap:wrap;gap:8px}
    .status-btn{border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;opacity:0.7}
    .status-btn:hover{opacity:1;transform:translateY(-1px)}
    .status-btn.active{opacity:1;box-shadow:0 0 0 2px currentColor}
    .status-btn[data-s="contacted"]{background:#e6f4ea;color:#2d8a4e}
    .status-btn[data-s="quoted"]{background:#e8f0fe;color:#1a73e8}
    .status-btn[data-s="booked"]{background:#d4edda;color:#1b7d3a}
    .status-btn[data-s="closed"]{background:#f0f0f0;color:#888}
    .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1c1c1c;color:#fff;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:500;opacity:0;transition:opacity 0.3s;pointer-events:none}
    .toast.show{opacity:1}
  </style>
</head>
<body>
  <div class="card">
    <span class="status-badge" id="statusBadge" style="background:${s.bg};color:${s.color}">${s.label}</span>
    <h1>${escapeHtml(q.service)}</h1>
    <div class="time">${created}</div>

    <div style="padding:12px 0;border-bottom:1px solid #eee">
      <span style="color:#888;font-size:13px">Customer</span><br>
      <strong>${escapeHtml(q.customer_name)}</strong>
    </div>
    <div style="padding:12px 0;border-bottom:1px solid #eee">
      <span style="color:#888;font-size:13px">Phone</span><br>
      <strong><a href="tel:${escapeHtml(q.customer_phone)}" style="color:#1b1b1b">${escapeHtml(q.customer_phone)}</a></strong>
    </div>
    ${q.customer_email ? `<div style="padding:12px 0;border-bottom:1px solid #eee"><span style="color:#888;font-size:13px">Email</span><br><strong>${escapeHtml(q.customer_email)}</strong></div>` : ''}
    ${answersHtml}

    <div class="contact">
      <a href="tel:${escapeHtml(q.customer_phone)}" class="btn-call">📞 Call Back</a>
      <a href="sms:${escapeHtml(q.customer_phone)}" class="btn-text">💬 Text Back</a>
    </div>

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee">
      <div style="font-size:12px;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Update Status</div>
      <div class="status-actions">
        <button class="status-btn ${status === 'contacted' ? 'active' : ''}" data-s="contacted" onclick="setStatus('contacted')">✅ Contacted</button>
        <button class="status-btn ${status === 'quoted' ? 'active' : ''}" data-s="quoted" onclick="setStatus('quoted')">📝 Quote Sent</button>
        <button class="status-btn ${status === 'booked' ? 'active' : ''}" data-s="booked" onclick="setStatus('booked')">🎉 Booked</button>
        <button class="status-btn ${status === 'closed' ? 'active' : ''}" data-s="closed" onclick="setStatus('closed')">✖ Closed</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const quoteId = '${id}';
    const token = '${escapeHtml(token)}';
    const statusMap = ${JSON.stringify(statusMap)};

    async function setStatus(newStatus) {
      try {
        const resp = await fetch('/api/quote/' + quoteId + '/status?t=' + token, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (!resp.ok) throw new Error('Failed');

        // Update badge
        const s = statusMap[newStatus];
        const badge = document.getElementById('statusBadge');
        badge.textContent = s.label;
        badge.style.background = s.bg;
        badge.style.color = s.color;

        // Update active button
        document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-s="' + newStatus + '"]').classList.add('active');

        showToast('Status updated to ' + s.label);
      } catch (e) {
        showToast('Failed to update — try again');
      }
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    }
  </script>
</body>
</html>`);
  } catch (err) {
    console.error('Quote view error:', err);
    res.status(500).send('Something went wrong');
  }
});

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;
