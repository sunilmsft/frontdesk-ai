const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

// R2 client (S3-compatible)
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'welcomemat-uploads';

// Multer: accept images only, max 5MB each
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * POST /api/upload
 * Body: multipart form data with field "photos" (up to 10 files)
 *       + "slug" field (business slug for folder organization)
 * Returns: array of uploaded file URLs
 */
router.post('/', upload.array('photos', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const slug = req.body.slug || 'unassigned';
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

  const results = [];

  for (const file of req.files) {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const filename = `${crypto.randomUUID()}.${ext}`;
    const key = `photos/${cleanSlug}/${filename}`;

    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    results.push({
      key,
      url: `/api/upload/${key}`,
      originalName: file.originalname,
      size: file.size,
    });
  }

  res.json({ uploaded: results });
});

/**
 * GET /api/upload/photos/:slug/:filename
 * Proxy images from R2 (avoids needing public bucket access)
 */
const { GetObjectCommand } = require('@aws-sdk/client-s3');

router.get('/photos/:slug/:filename', async (req, res) => {
  const key = `photos/${req.params.slug}/${req.params.filename}`;

  try {
    const response = await r2.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    res.set('Content-Type', response.ContentType);
    res.set('Cache-Control', 'public, max-age=31536000');
    response.Body.pipe(res);
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

module.exports = router;
