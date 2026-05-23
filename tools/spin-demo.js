#!/usr/bin/env node
// Spin up a demo site for a lead in ~30 seconds
// Uses their Google Places info + GPT to customize the template
// Usage: node tools/spin-demo.js "Bigfoot Tree Care" "Kent, WA"

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const bizQuery = process.argv[2];
const fallbackCity = process.argv[3] || '';

if (!bizQuery) {
  console.log(`
  🚀 WelcomeMat Demo Site Generator

  Spin up a demo site for a lead using their Google listing.

  Usage:
    node tools/spin-demo.js "Business Name" "City, WA"

  Examples:
    node tools/spin-demo.js "Bigfoot Tree Care" "Kent, WA"
    node tools/spin-demo.js "Vazquez Painting LLC" "Kent, WA"
    node tools/spin-demo.js "Legacy Services Carpet cleaning" "Auburn, WA"
  `);
  process.exit(0);
}

if (!API_KEY || !process.env.OPENAI_API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY or OPENAI_API_KEY in .env');
  process.exit(1);
}

// --- Step 1: Find the business on Google ---
async function findBusiness(query, city) {
  const searchQuery = city ? `${query} ${city}` : query;
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.googleMapsUri,places.types,places.reviews',
    },
    body: JSON.stringify({ textQuery: searchQuery, languageCode: 'en' }),
  });
  const data = await res.json();
  if (!data.places || data.places.length === 0) return null;
  return data.places[0];
}

// --- Step 2: Ask GPT to customize the template content ---
async function generateContent(biz) {
  const name = biz.displayName?.text || bizQuery;
  const address = biz.formattedAddress || '';
  const phone = biz.nationalPhoneNumber || '';
  const rating = biz.rating || '';
  const reviews = biz.userRatingCount || 0;
  const types = (biz.types || []).join(', ');
  
  // Extract review texts for context
  const reviewTexts = (biz.reviews || [])
    .slice(0, 5)
    .map(r => r.text?.text || '')
    .filter(Boolean)
    .join('\n');

  const prompt = `You are generating website content for a local service business. Based on the Google listing info below, create customized content for their website.

BUSINESS INFO:
- Name: ${name}
- Address: ${address}
- Phone: ${phone}
- Rating: ${rating} (${reviews} reviews)
- Google categories: ${types}
- Customer reviews: 
${reviewTexts || '(no reviews available)'}

Return ONLY a JSON object with these exact keys (all values are strings):
{
  "trade": "one word trade category like landscaping, painting, tree-service, cleaning, etc",
  "tagline": "short punchy tagline for the hero, 4-8 words, use <br><em>emphasis</em> on key phrase",
  "heroText": "one sentence describing what they do, casual and confident",
  "heroIcon": "phosphor icon name for their trade (e.g. ph-tree, ph-paint-roller, ph-broom, ph-truck)",
  "metaDesc": "SEO meta description, ~150 chars",
  "svc1Title": "service 1 name",
  "svc1Text": "service 1 description, 1-2 sentences",
  "svc1Icon": "phosphor icon name",
  "svc2Title": "service 2 name",
  "svc2Text": "service 2 description",
  "svc2Icon": "phosphor icon name",
  "svc3Title": "service 3 name",
  "svc3Text": "service 3 description",
  "svc3Icon": "phosphor icon name",
  "svc4Title": "service 4 name",
  "svc4Text": "service 4 description",
  "svc4Icon": "phosphor icon name",
  "aboutHi": "short intro sentence about the business, warm and personal",
  "aboutP1": "first about paragraph, why they started or what drives them",
  "aboutP2": "second about paragraph, what makes them different",
  "serviceArea": "city/area they serve based on address",
  "ownerName": "best guess at owner name from reviews or business name, or just 'The ${name} Team'",
  "statYears": "estimated years in business or just '5+'",
  "statProjects": "estimated jobs done or '100+'",
  "accentColor": "hex color that fits their trade (blue for water/cleaning, green for landscaping, orange for construction, etc)"
}

Infer services from the business type and reviews. Be specific to THEIR trade, not generic. Keep copy casual and confident — these are working tradespeople, not corporate brands.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  return JSON.parse(completion.choices[0].message.content);
}

// --- Step 3: Build the site ---
async function main() {
  console.log(`\n🔍 Looking up "${bizQuery}"...`);
  
  const biz = await findBusiness(bizQuery, fallbackCity);
  if (!biz) {
    console.error('❌ Business not found on Google. Try a more specific name or add the city.');
    process.exit(1);
  }

  const name = biz.displayName?.text || bizQuery;
  const phone = biz.nationalPhoneNumber || '(000) 000-0000';
  const rating = biz.rating || '5.0';
  const reviews = biz.userRatingCount || 0;
  const address = biz.formattedAddress || '';

  console.log(`✅ Found: ${name}`);
  console.log(`   📍 ${address}`);
  console.log(`   📞 ${phone}`);
  console.log(`   ⭐ ${rating} (${reviews} reviews)\n`);

  console.log('🤖 Generating custom content...');
  const content = await generateContent(biz);

  console.log(`   Trade: ${content.trade}`);
  console.log(`   Color: ${content.accentColor}`);

  // Pick template based on trade
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const tradeTemplateMap = {
    'cleaning': 'fresh-clean',
    'carpet-cleaning': 'fresh-clean',
    'janitorial': 'fresh-clean',
    'maid-service': 'fresh-clean',
    'housekeeping': 'fresh-clean',
  };
  const templateName = tradeTemplateMap[content.trade] || 'bold-trade';
  console.log(`   Template: ${templateName}`);
  const templatePath = path.join(__dirname, '..', 'public', 'templates', templateName, 'index.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Replace placeholders
  html = html.replaceAll('{{BUSINESS_NAME}}', name);
  html = html.replaceAll('{{PHONE}}', phone);
  html = html.replaceAll('{{SERVICE_AREA}}', content.serviceArea);
  html = html.replaceAll('{{OWNER_NAME}}', content.ownerName);
  html = html.replaceAll('{{SLUG}}', slug);

  // Hero image — pick based on trade keywords in business name
  {
    const nameLower = name.toLowerCase();
    const heroImages = {
      // Cleaning trades (fresh-clean template)
      'carpet':  'https://images.unsplash.com/photo-1758523670739-0d26a3ee976d?w=1600&q=80',
      'floor':   'https://images.unsplash.com/photo-1758523670739-0d26a3ee976d?w=1600&q=80',
      'rug':     'https://images.unsplash.com/photo-1758523670739-0d26a3ee976d?w=1600&q=80',
      'maid':    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80',
      'house':   'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80',
      // Tree trades (bold-trade template)
      'tree':    'https://images.unsplash.com/photo-1754321889123-0485c7fea5f1?w=1600&q=80',
      'arborist':'https://images.unsplash.com/photo-1754321889123-0485c7fea5f1?w=1600&q=80',
      // Junk / hauling trades (bold-trade template)
      'junk':    'https://images.unsplash.com/photo-1628464682320-6a9ae020cb2b?w=1600&q=80',
      'haul':    'https://images.unsplash.com/photo-1628464682320-6a9ae020cb2b?w=1600&q=80',
      'removal': 'https://images.unsplash.com/photo-1628464682320-6a9ae020cb2b?w=1600&q=80',
      'default': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80',
    };
    const match = Object.keys(heroImages).find(k => k !== 'default' && nameLower.includes(k));
    html = html.replaceAll('{{HERO_IMAGE}}', heroImages[match] || heroImages['default']);
  }
  html = html.replaceAll('{{SERVER_URL}}', 'https://frontdesk-ai-vx1s.onrender.com');

  // Replace meta description
  html = html.replace(/<meta name="description" content="[^"]*">/, 
    `<meta name="description" content="${content.metaDesc}">`);

  // Replace title trade
  html = html.replace(/— Professional (Landscaping|Cleaning)/, `— ${content.svc1Title}`);

  // Replace accent color (both templates)
  if (content.accentColor) {
    html = html.replace(/--accent: #[0-9a-fA-F]{6};/, `--accent: ${content.accentColor};`);
    html = html.replace(/--accent-dark: #[0-9a-fA-F]{6};/, `--accent-dark: ${content.accentColor};`);
    html = html.replace(/--accent-light: #[0-9a-fA-F]{6};/, `--accent-light: ${content.accentColor};`);
  }

  // Replace hero content (both templates)
  html = html.replace(/<h1 data-i18n="heroTitle">[^]*?<\/h1>/, 
    `<h1 data-i18n="heroTitle">${content.tagline}</h1>`);
  html = html.replace(/(data-i18n="heroText">)[^<]*/, `$1${content.heroText}`);

  // Replace hero icon (bold-trade only, fresh-clean has no icons)
  if (templateName === 'bold-trade') {
    html = html.replace(/ph-fill ph-tree"><\/i> Serving/, `ph-fill ${content.heroIcon}"></i> Serving`);
  }

  // Replace stats
  html = html.replace(/(data-i18n="statYears">)[^<]*/, `$1${content.statYears}`);
  html = html.replace(/(data-i18n="statProjects">)[^<]*/, `$1${content.statProjects}`);
  html = html.replace(/(data-i18n="statRating">)[^<]*/, `$1${rating}`);

  // Replace services
  const svcReplacements = [
    ['svc1Title', 'svc1Text', 'svc1Icon'],
    ['svc2Title', 'svc2Text', 'svc2Icon'],
    ['svc3Title', 'svc3Text', 'svc3Icon'],
    ['svc4Title', 'svc4Text', 'svc4Icon'],
  ];
  for (const [titleKey, textKey, iconKey] of svcReplacements) {
    if (content[titleKey]) {
      html = html.replace(new RegExp(`(data-i18n="${titleKey}">)[^<]*`), `$1${content[titleKey]}`);
    }
    if (content[textKey]) {
      html = html.replace(new RegExp(`(data-i18n="${textKey}">)[^<]*`), `$1${content[textKey]}`);
    }
  }

  // Replace about section
  html = html.replace(/(data-i18n="aboutHi">)[^<]*/, `$1${content.aboutHi}`);
  html = html.replace(/(data-i18n="aboutP1">)[^<]*/, `$1${content.aboutP1}`);
  html = html.replace(/(data-i18n="aboutP2">)[^<]*/, `$1${content.aboutP2}`);

  // Replace Google reviews count in review section if present
  html = html.replace(/\b500\+\b/, `${reviews > 0 ? reviews + '+' : '100+'}`);

  // --- Inject real Google reviews ---
  const googleReviews = (biz.reviews || []).filter(r => r.text?.text);
  if (googleReviews.length > 0) {
    // Make reviews section visible
    html = html.replace('id="reviews" style="display:none;"', 'id="reviews"');

    // Build summary HTML
    const starSVG = '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
    const summaryHTML = `
      <div class="reviews-stars">${starSVG.repeat(5)}</div>
      <div class="reviews-rating">${rating}</div>
      <div class="reviews-count">${reviews} reviews on Google</div>`;
    html = html.replace('<div class="reviews-summary pop" id="reviewsSummary"></div>',
      `<div class="reviews-summary pop" id="reviewsSummary">${summaryHTML}</div>`);

    // Build review cards
    const reviewCards = googleReviews.slice(0, 6).map(r => {
      const author = r.authorAttribution?.displayName || 'Customer';
      const time = r.relativePublishTimeDescription || '';
      const text = r.text.text.replace(/"/g, '&quot;').replace(/</g, '&lt;');
      const rStars = r.rating || 5;
      const smallStar = '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
      return `
        <div class="review-card pop">
          <div class="review-header">
            <div class="review-avatar-placeholder">${author.charAt(0).toUpperCase()}</div>
            <div>
              <div class="review-author">${author}</div>
              <div class="review-time">${time}</div>
            </div>
          </div>
          <div class="review-stars">${smallStar.repeat(rStars)}</div>
          <div class="review-text">${text}</div>
        </div>`;
    }).join('\n');

    html = html.replace('<div class="reviews-grid" id="reviewsGrid"></div>',
      `<div class="reviews-grid" id="reviewsGrid">${reviewCards}</div>`);

    // Add Reviews to nav (handle both template structures)
    if (templateName === 'bold-trade') {
      html = html.replace(
        '<li><a href="#areas" data-i18n="navAreas">Areas</a></li>',
        '<li><a href="#reviews">Reviews</a></li>\n        <li><a href="#areas" data-i18n="navAreas">Areas</a></li>'
      );
    } else {
      html = html.replace(
        '<a href="#about">About</a>',
        '<a href="#reviews">Reviews</a>\n    <a href="#about">About</a>'
      );
    }
  }
  // Add demo banner
  const bannerFont = templateName === 'fresh-clean' ? "'Work Sans',sans-serif" : "'Source Sans 3',sans-serif";
  html = html.replace('<body>', `<body>
  <div style="background:#f0fdf4; color:#1e293b; text-align:center; padding:5px 16px; font-size:11px; font-family:${bannerFont}; position:relative; z-index:1001; letter-spacing:0.3px; border-bottom:1px solid #d1fae5;">
    🎨 Preview for <strong>${name}</strong> — <a href="https://welcomematdigital.com/contact" style="color:#0d9488; text-decoration:underline;">Make it yours</a>
  </div>`);

  // Create output dir
  const outDir = path.join(__dirname, '..', 'public', 'sites', slug);
  
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

  console.log(`\n🎉 Demo site created!`);
  console.log(`   📁 public/sites/${slug}/index.html`);
  console.log(`   🌐 Local:  http://localhost:3001/sites/${slug}/`);
  console.log(`   🌐 Live:   https://welcomematdigital.com/sites/${slug}/`);
  console.log(`\n   Send this link to ${name} when they respond to your text!\n`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
