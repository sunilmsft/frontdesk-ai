const express = require('express');
const crypto = require('crypto');
const { db } = require('../db/database');

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SERVICE_AREA_MAX_LENGTH = 200;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CONCEPT_NOTIFICATION_EMAIL = process.env.CONCEPT_NOTIFICATION_EMAIL || process.env.NOTIFICATION_EMAIL;
const EMAIL_FROM = 'WelcomeMat <onboarding@resend.dev>';
const ADMIN_URL = process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, '')}/admin.html` : null;
const MATERIAL_OPTIONS = [
  'Logo',
  'Business or product photos',
  'Menu or service list',
  'Brand colors or guidelines',
  'Customer reviews',
  'None yet',
  'Not sure'
];
const REQUIRED_FIELDS = [
  'name',
  'email',
  'businessName',
  'businessDescription',
  'serviceArea',
  'customerActions',
  'improvement'
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeSubjectBusinessName(value) {
  const withoutTags = String(value ?? '').replace(/<[^>]*>/g, '');
  const singleLine = withoutTags.replace(/[\r\n]+/g, ' ');
  const compact = singleLine.replace(/\s+/g, ' ').trim().slice(0, 80).trim();
  return compact || 'Unnamed business';
}

function formatList(value) {
  if (!Array.isArray(value) || value.length === 0) return 'None provided';
  return value.map(item => String(item)).join(', ');
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch (_) {
    return null;
  }
}

function redactRecipient(value) {
  if (!value) return null;
  const [localPart, domain] = String(value).split('@');
  return domain ? `${localPart.slice(0, 1)}***@${domain}` : '[configured]';
}

function redactProviderMessage(value) {
  return String(value || 'Unknown provider error')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/\s+/g, ' ')
    .slice(0, 180);
}

console.log('  Concept notification config:', JSON.stringify({
  apiKeyPresent: Boolean(RESEND_API_KEY),
  recipientPresent: Boolean(CONCEPT_NOTIFICATION_EMAIL),
  recipient: redactRecipient(CONCEPT_NOTIFICATION_EMAIL),
  sender: EMAIL_FROM
}));

async function sendConceptNotification(inquiry) {
  if (!RESEND_API_KEY || !CONCEPT_NOTIFICATION_EMAIL) {
    console.error('  Concept notification skipped: missing configuration', JSON.stringify({
      apiKeyPresent: Boolean(RESEND_API_KEY),
      recipientPresent: Boolean(CONCEPT_NOTIFICATION_EMAIL)
    }));
    return;
  }

  console.log('  Concept notification attempted', JSON.stringify({
    recipient: redactRecipient(CONCEPT_NOTIFICATION_EMAIL),
    sender: EMAIL_FROM
  }));

  const onlinePresence = safeExternalUrl(inquiry.onlinePresence);
  const fields = [
    ['Owner name', inquiry.name],
    ['Business name', inquiry.businessName],
    ['Email', inquiry.email],
    ['Business description', inquiry.businessDescription],
    ['What they would most like to improve', inquiry.improvement],
    ['Service area', inquiry.serviceArea],
    ['Desired customer actions', formatList(inquiry.customerActions)],
    ['Languages', inquiry.languages || 'None provided'],
    ['Available materials', formatList(inquiry.availableMaterials)],
    ['Additional information', inquiry.anythingElse || 'None provided'],
    ['Submission timestamp', inquiry.createdAt]
  ];
  const text = fields.map(([label, value]) => `${label}: ${value}`).join('\n')
    + (onlinePresence ? `\nOnline presence: ${onlinePresence}` : '')
    + (ADMIN_URL ? `\nAdmin dashboard: ${ADMIN_URL}` : '');
  const rows = fields.map(([label, value]) => `
    <tr><td style="color:#64748b;padding:6px 12px 6px 0;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`).join('');
  const onlineRow = onlinePresence
    ? `<tr><td style="color:#64748b;padding:6px 12px 6px 0">Online presence</td><td style="padding:6px 0"><a href="${escapeHtml(onlinePresence)}">${escapeHtml(onlinePresence)}</a></td></tr>`
    : '';
  const adminRow = ADMIN_URL
    ? `<p><a href="${escapeHtml(ADMIN_URL)}">Open authenticated admin dashboard</a></p>`
    : '';
  const html = `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:640px;margin:0 auto"><h2>New WelcomeMat concept inquiry</h2><table style="width:100%;border-collapse:collapse">${rows}${onlineRow}</table>${adminRow}</div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [CONCEPT_NOTIFICATION_EMAIL],
        subject: `New WelcomeMat concept inquiry — ${sanitizeSubjectBusinessName(inquiry.businessName)}`,
        html,
        text
      })
    });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('  Concept notification rejected', JSON.stringify({
        status: response.status,
        providerCode: responseBody.name || responseBody.code || 'unknown',
        message: redactProviderMessage(responseBody.message)
      }));
      return;
    }
    console.log('  Concept notification accepted', JSON.stringify({
      status: response.status,
      providerId: responseBody.id || 'unknown'
    }));
  } catch (err) {
    console.error('  Concept notification transport error', JSON.stringify({
      name: err.name || 'Error',
      message: redactProviderMessage(err.message)
    }));
  }
}

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const missing = REQUIRED_FIELDS.filter(field => {
      const value = body[field];
      return !value || (Array.isArray(value) ? value.length === 0 : !String(value).trim());
    });

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Please complete all required fields.' });
    }

    const serviceArea = String(body.serviceArea).trim();
    if (serviceArea.length > SERVICE_AREA_MAX_LENGTH) {
      return res.status(400).json({ error: 'Please enter a location or service area of 200 characters or fewer.' });
    }

    const email = String(body.email).trim();
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const customerActions = Array.isArray(body.customerActions)
      ? body.customerActions.map(value => String(value).trim()).filter(Boolean)
      : [];
    if (customerActions.length === 0) {
      return res.status(400).json({ error: 'Choose at least one way customers should reach you.' });
    }

    const rawMaterials = body.availableMaterials;
    if (rawMaterials !== undefined && rawMaterials !== null && !Array.isArray(rawMaterials)) {
      return res.status(400).json({ error: 'Available materials must be a list.' });
    }
    const availableMaterials = rawMaterials || [];
    const hasInvalidMaterial = availableMaterials.some(value => typeof value !== 'string' || !MATERIAL_OPTIONS.includes(value));
    const hasDuplicateMaterial = new Set(availableMaterials).size !== availableMaterials.length;
    const hasExclusiveMaterial = availableMaterials.includes('None yet') || availableMaterials.includes('Not sure');
    if (hasInvalidMaterial || hasDuplicateMaterial || (hasExclusiveMaterial && availableMaterials.length > 1)) {
      return res.status(400).json({ error: 'Please choose valid available material options.' });
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO concept_inquiries
        (id, name, email, business_name, business_description, service_area, customer_actions, improvement, online_presence, languages, available_materials, anything_else)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        String(body.name).trim(),
        email,
        String(body.businessName).trim(),
        String(body.businessDescription).trim(),
        serviceArea,
        JSON.stringify(customerActions),
        String(body.improvement).trim(),
        body.onlinePresence ? String(body.onlinePresence).trim() : null,
        body.languages ? String(body.languages).trim() : null,
        availableMaterials.length > 0 ? JSON.stringify(availableMaterials) : null,
        body.anythingElse ? String(body.anythingElse).trim() : null
      ]
    });

    const inquiry = {
      name: String(body.name).trim(),
      email,
      businessName: String(body.businessName).trim(),
      businessDescription: String(body.businessDescription).trim(),
      serviceArea,
      customerActions,
      improvement: String(body.improvement).trim(),
      onlinePresence: body.onlinePresence ? String(body.onlinePresence).trim() : null,
      languages: body.languages ? String(body.languages).trim() : null,
      availableMaterials,
      anythingElse: body.anythingElse ? String(body.anythingElse).trim() : null,
      createdAt: new Date().toISOString()
    };
    await sendConceptNotification(inquiry);
    console.log('  Concept inquiry stored');
    res.json({ success: true, id });
  } catch (err) {
    console.error('Concept intake error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
module.exports.sanitizeSubjectBusinessName = sanitizeSubjectBusinessName;