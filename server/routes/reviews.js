const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MANUAL_REVIEW_FALLBACKS = {
  'camellia-cleaning': {
    reviews: [],
    rating: 5.0,
    totalReviews: 1,
    googleMapsUrl: 'https://www.google.com/search?q=Camellia+Cleaning+Service',
    source: 'manual-fallback'
  }
};

function normalizePlaceId(rawValue) {
  if (!rawValue) return null;

  let value = String(rawValue).trim();
  if (!value) return null;

  if (value.startsWith('places/')) {
    value = value.slice('places/'.length);
  }

  // If user pasted a Google Maps URL, try extracting place identifiers from common params/patterns.
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      const placeIdParam = u.searchParams.get('place_id') || u.searchParams.get('query_place_id');
      if (placeIdParam) value = placeIdParam;

      const qParam = u.searchParams.get('q');
      if (qParam && qParam.startsWith('place_id:')) {
        value = qParam.slice('place_id:'.length);
      }

      const oneSMatch = value.match(/!1s(ChI[A-Za-z0-9_-]+)/);
      if (oneSMatch) value = oneSMatch[1];
    } catch {
      // Keep original if URL parsing fails.
    }
  }

  const chIMatch = value.match(/(ChI[A-Za-z0-9_-]+)/);
  if (chIMatch) {
    return chIMatch[1];
  }

  return value;
}

/**
 * GET /api/reviews/:slug — Return cached Google reviews for a business
 * Fetches from Google Places API (New) and caches for 24h
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const manualFallback = MANUAL_REVIEW_FALLBACKS[slug] || null;

    // Look up business and its Google Place ID
    const bizResult = await db.execute({
      sql: 'SELECT id, google_place_id FROM businesses WHERE slug = ?',
      args: [slug]
    });
    const biz = bizResult.rows[0];
    const placeId = normalizePlaceId(biz?.google_place_id);
    if (!biz || !placeId) {
      if (manualFallback) return res.json(manualFallback);
      return res.json({ reviews: [], rating: null, totalReviews: 0 });
    }

    // Check cache
    const cached = await db.execute({
      sql: 'SELECT data, fetched_at FROM reviews_cache WHERE business_id = ?',
      args: [biz.id]
    });

    if (cached.rows.length > 0) {
      const age = Date.now() - new Date(cached.rows[0].fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        return res.json(JSON.parse(cached.rows[0].data));
      }
    }

    // Fetch from Google Places API (New)
    if (!GOOGLE_API_KEY) {
      if (manualFallback) return res.json(manualFallback);
      return res.json({ reviews: [], rating: null, totalReviews: 0 });
    }

    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    const response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'reviews,rating,userRatingCount,googleMapsUri'
      }
    });

    if (!response.ok) {
      console.error('Google Places API error:', response.status, await response.text());
      // Return stale cache if available
      if (cached.rows.length > 0) {
        return res.json(JSON.parse(cached.rows[0].data));
      }
      if (manualFallback) return res.json(manualFallback);
      return res.json({ reviews: [], rating: null, totalReviews: 0 });
    }

    const place = await response.json();

    // Normalize the response
    const data = {
      reviews: (place.reviews || []).map(r => ({
        author: r.authorAttribution?.displayName || 'A Google user',
        authorPhoto: r.authorAttribution?.photoUri || null,
        rating: r.rating || 0,
        text: r.text?.text || '',
        time: r.publishTime || '',
        relativeTime: r.relativePublishTimeDescription || '',
      })),
      rating: place.rating || null,
      totalReviews: place.userRatingCount || 0,
      googleMapsUrl: place.googleMapsUri || null,
    };

    // Upsert cache
    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO reviews_cache (business_id, data, fetched_at)
            VALUES (?, ?, ?)
            ON CONFLICT(business_id) DO UPDATE SET data = ?, fetched_at = ?`,
      args: [biz.id, JSON.stringify(data), now, JSON.stringify(data), now]
    });

    res.json(data);
  } catch (err) {
    console.error('Reviews fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

module.exports = router;
