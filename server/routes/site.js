const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const path = require('path');
const fs = require('fs');

/**
 * GET /site/:slug — Serve a business landing page
 * Looks up the business by slug, injects data into the template
 */
router.get('/:slug', async (req, res) => {
  const result = await db.execute({ sql: 'SELECT * FROM businesses WHERE slug = ?', args: [req.params.slug] });
  const biz = result.rows[0];
  if (!biz) return res.status(404).send('Business not found');

  // Load the site template and inject business data
  const templatePath = path.join(__dirname, '..', '..', 'public', 'sites', biz.slug, 'index.html');
  const fallbackPath = path.join(__dirname, '..', '..', 'public', 'sites', '_template.html');

  // Use custom page if exists, otherwise use template
  const pagePath = fs.existsSync(templatePath) ? templatePath : fallbackPath;
  if (!fs.existsSync(pagePath)) {
    return res.status(404).send('Site template not found');
  }

  let html = fs.readFileSync(pagePath, 'utf-8');

  // Inject business data into template placeholders
  const replacements = {
    '{{BUSINESS_NAME}}': biz.name || '',
    '{{BUSINESS_SLUG}}': biz.slug || '',
    '{{BUSINESS_ID}}': biz.id || '',
    '{{THEME_COLOR}}': biz.theme_color || '#0d9488',
    '{{WELCOME_MESSAGE}}': biz.welcome_message || '',
    '{{OWNER_NAME}}': biz.owner_name || '',
    '{{PHONE}}': biz.phone || '',
    '{{BUSINESS_TYPE}}': biz.business_type || '',
    '{{SERVICE_AREA}}': biz.service_area || '',
    '{{WIDGET_URL}}': `${req.protocol}://${req.get('host')}/widget/frontdesk-widget.js`,
    '{{SITE_URL}}': `${req.protocol}://${req.get('host')}/site/${biz.slug}`,
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(key).join(value);
  }

  res.send(html);
});

module.exports = router;
