const express = require('express');
const crypto = require('crypto');
const { db } = require('../db/database');

const router = express.Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const LANG_NAMES = { en: 'English', es: 'Spanish', pt: 'Portuguese' };
const LOOKING_FOR_LABELS = {
  en: { website: 'Website', google: 'Google Setup', both: 'Website + Google Setup', not_sure: 'Not sure yet' },
  es: { website: 'Sitio web', google: 'Perfil de Google', both: 'Sitio web + Google', not_sure: 'No estoy seguro/a' },
  pt: { website: 'Site', google: 'Google Meu Negócio', both: 'Site + Google', not_sure: 'Ainda não sei' }
};

/**
 * Translate text to English via OpenAI (if not already English)
 */
async function translateToEnglish(text, fromLang) {
  if (!text || fromLang === 'en' || !OPENAI_API_KEY) return null;
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Translate the following text to English. Return only the translation, nothing else.' },
          { role: 'user', content: text }
        ],
        max_tokens: 300,
        temperature: 0.1
      })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Send contact notification email via Resend
 */
async function sendContactEmail({ name, businessName, phone, lookingFor, message, translatedMessage, language, referral }) {
  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL) return;

  const langLabel = LANG_NAMES[language] || language;
  const lookingForLabel = LOOKING_FOR_LABELS.en[lookingFor] || lookingFor || '—';

  // Pre-filled reply messages in the contact's language
  const REPLY_MESSAGES = {
    en: (n) => `Hi ${n}! This is Sunil from WelcomeMat. Thanks for reaching out — I'd love to learn more about your business. When's a good time to chat?`,
    es: (n) => `¡Hola ${n}! Soy Sunil de WelcomeMat. Gracias por escribirnos — me encantaría saber más sobre tu negocio. ¿Cuándo te viene bien para hablar?`,
    pt: (n) => `Oi ${n}! Aqui é o Sunil da WelcomeMat. Obrigado por entrar em contato — adoraria saber mais sobre o seu negócio. Quando é um bom horário pra conversar?`
  };
  const replyMsg = (REPLY_MESSAGES[language] || REPLY_MESSAGES.en)(name);
  const replyEncoded = encodeURIComponent(replyMsg);
  const phoneDigitsClean = phone.replace(/\D/g, '');

  // Google Translate link: English → contact's language
  const LANG_CODES = { en: 'en', es: 'es', pt: 'pt' };
  const translateUrl = `https://translate.google.com/?sl=en&tl=${LANG_CODES[language] || 'en'}&op=translate`;

  let messageSection = '';
  if (message) {
    messageSection = `
      <tr><td style="color:#888;padding:6px 12px 6px 0;font-size:14px;vertical-align:top">Message (${langLabel})</td><td style="font-weight:600;padding:6px 0;font-size:14px">${message}</td></tr>`;
    if (translatedMessage && language !== 'en') {
      messageSection += `
      <tr><td style="color:#888;padding:6px 12px 6px 0;font-size:14px;vertical-align:top">English translation</td><td style="padding:6px 0;font-size:14px;color:#4b5563;font-style:italic">${translatedMessage}</td></tr>`;
    }
  }

  const html = `
<div style="font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:0 auto">
  <div style="background:#0f172a;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#5eead4;margin-bottom:4px">New Contact Inquiry</div>
    <div style="font-size:22px;font-weight:700">${name}</div>
    ${referral ? `<div style="font-size:13px;color:#94a3b8;margin-top:4px">Referred by: ${referral}</div>` : ''}
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="color:#888;padding:6px 12px 6px 0;font-size:14px">Business</td><td style="font-weight:600;padding:6px 0;font-size:14px">${businessName || '—'}</td></tr>
      <tr><td style="color:#888;padding:6px 12px 6px 0;font-size:14px">Phone / WhatsApp</td><td style="font-weight:600;padding:6px 0;font-size:14px"><a href="tel:${phone}" style="color:#0f172a">${phone}</a></td></tr>
      <tr><td style="color:#888;padding:6px 12px 6px 0;font-size:14px">Interested in</td><td style="font-weight:600;padding:6px 0;font-size:14px">${lookingForLabel}</td></tr>
      <tr><td style="color:#888;padding:6px 12px 6px 0;font-size:14px">Language</td><td style="font-weight:600;padding:6px 0;font-size:14px">${langLabel}</td></tr>
      ${messageSection}
    </table>
    <div style="margin-top:20px;display:flex;gap:10px">
      <a href="tel:${phone}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">📞 Call</a>
      <a href="sms:${phoneDigitsClean}?body=${replyEncoded}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">💬 Text in ${langLabel}</a>
      <a href="https://wa.me/${phoneDigitsClean}?text=${replyEncoded}" style="display:inline-block;background:#25d366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">WhatsApp in ${langLabel}</a>
    </div>${language !== 'en' ? `
    <div style="margin-top:14px;background:#f8fafc;border-radius:8px;padding:12px 14px;border:1px solid #e2e8f0">
      <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Quick reply (pre-filled in ${langLabel}):</div>
      <div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:4px">${replyMsg}</div>
      <div style="font-size:12px;color:#64748b;line-height:1.5;font-style:italic;margin-bottom:10px">↳ "${REPLY_MESSAGES.en(name)}"</div>
      <div style="border-top:1px solid #e2e8f0;padding-top:10px;margin-top:6px">
        <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Need to say something else?</div>
        <a href="${translateUrl}" style="display:inline-block;background:#4285f4;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px">🌐 Open Translator (EN → ${langLabel})</a>
        <div style="font-size:11px;color:#94a3b8;margin-top:6px">Type in English, copy the translation, paste into your text/WhatsApp</div>
      </div>
    </div>` : ''}
  </div>
  <p style="text-align:center;font-size:11px;color:#aaa;margin-top:12px">Sent by WelcomeMat Contact Form</p>
</div>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'WelcomeMat <onboarding@resend.dev>',
        to: [NOTIFICATION_EMAIL],
        subject: `🌐 New inquiry: ${name}${businessName ? ` — ${businessName}` : ''} (${langLabel})`,
        html
      })
    });
    if (resp.ok) {
      console.log(`  📧 Contact email sent for ${name}`);
    } else {
      const err = await resp.text();
      console.error('  ⚠️ Contact email failed:', err);
    }
  } catch (err) {
    console.error('  ⚠️ Contact email error:', err.message);
  }
}

/**
 * POST /api/contact — Submit a contact inquiry
 * Body: { name, businessName?, phone, lookingFor?, message?, language, referral? }
 */
router.post('/', async (req, res) => {
  try {
    const { name, businessName, phone, lookingFor, message, language, referral } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Validate phone — at least 10 digits
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return res.status(400).json({ error: 'Please enter a valid phone number' });
    }

    const lang = ['en', 'es', 'pt'].includes(language) ? language : 'en';
    const id = crypto.randomUUID();

    // Translate message to English if needed
    let translatedMessage = null;
    if (message && lang !== 'en') {
      translatedMessage = await translateToEnglish(message, lang);
    }

    await db.execute({
      sql: `INSERT INTO contact_inquiries (id, name, business_name, phone, looking_for, message, language, translated_message, referral)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, name, businessName || null, phone, lookingFor || null, message || null, lang, translatedMessage, referral || null]
    });

    // Send email notification
    await sendContactEmail({
      name, businessName, phone, lookingFor, message, translatedMessage, language: lang, referral
    });

    console.log(`  📬 Contact inquiry from ${name} (${lang})`);
    res.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
