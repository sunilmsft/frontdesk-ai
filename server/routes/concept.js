const express = require('express');
const crypto = require('crypto');
const { db } = require('../db/database');

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
        String(body.serviceArea).trim(),
        JSON.stringify(customerActions),
        String(body.improvement).trim(),
        body.onlinePresence ? String(body.onlinePresence).trim() : null,
        body.languages ? String(body.languages).trim() : null,
        availableMaterials.length > 0 ? JSON.stringify(availableMaterials) : null,
        body.anythingElse ? String(body.anythingElse).trim() : null
      ]
    });

    console.log(`  📬 Concept inquiry from ${body.name} (${body.businessName})`);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Concept intake error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;