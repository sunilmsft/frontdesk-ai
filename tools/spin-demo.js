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
const isDemo = process.argv.includes('--demo'); // Generic category demo mode

if (!bizQuery) {
  console.log(`
  🚀 WelcomeMat Demo Site Generator

  Spin up a demo site for a lead using their Google listing.

  Usage:
    node tools/spin-demo.js "Business Name" "City, WA"
    node tools/spin-demo.js "Business Name" "City, WA" --demo   (generic category demo)

  Examples:
    node tools/spin-demo.js "Bigfoot Tree Care" "Kent, WA"
    node tools/spin-demo.js "Summit Tree Care" "Seattle, WA" --demo
    node tools/spin-demo.js "QuickTurn Locksmith" "Bellevue, WA" --demo
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
  "trade": "one word trade category like landscaping, painting, tree-service, cleaning, locksmithing, detailing, notary, junk-removal, etc",
  "tagline": "short punchy tagline for the hero, 4-8 words, use <br><em>emphasis</em> on key phrase",
  "heroText": "one sentence describing what they do, casual and confident",
  "heroIcon": "phosphor icon name for their trade (e.g. ph-tree, ph-paint-roller, ph-broom, ph-truck, ph-key, ph-car, ph-stamp, ph-recycle)",
  "metaDesc": "SEO meta description, ~150 chars",
  "servicesTitle": "catchy services section headline, 3-5 words, specific to this trade",
  "servicesText": "one sentence describing what they offer overall",
  "svc1Title": "service 1 name",
  "svc1Text": "service 1 description, 1-2 sentences, specific to THIS trade",
  "svc1Icon": "phosphor icon name (ph-xxx format)",
  "svc2Title": "service 2 name",
  "svc2Text": "service 2 description, specific to THIS trade",
  "svc2Icon": "phosphor icon name",
  "svc3Title": "service 3 name",
  "svc3Text": "service 3 description, specific to THIS trade",
  "svc3Icon": "phosphor icon name",
  "svc4Title": "service 4 name",
  "svc4Text": "service 4 description, specific to THIS trade",
  "svc4Icon": "phosphor icon name",
  "svc5Title": "service 5 name",
  "svc5Text": "service 5 description, specific to THIS trade",
  "svc5Icon": "phosphor icon name",
  "svc6Title": "service 6 name",
  "svc6Text": "service 6 description, specific to THIS trade",
  "svc6Icon": "phosphor icon name",
  "aboutHi": "short intro sentence about the business, warm and personal",
  "aboutP1": "first about paragraph, why they started or what drives them",
  "aboutP2": "second about paragraph, what makes them different",
  "serviceArea": "city/area they serve based on address",
  "ownerName": "best guess at owner name from reviews or business name, or just 'The ${name} Team'",
  "statYears": "estimated years in business or just '5+'",
  "statProjects": "estimated jobs done or '100+'",
  "accentColor": "hex color that fits their trade (gold/amber for locksmith, green for tree/landscaping, orange for junk/hauling, blue for cleaning/detailing, navy for notary, red for roofing, etc)"
}

CRITICAL: All 6 services MUST be specific to the business trade. If this is a locksmith, ALL 6 services should be locksmith services. If detailing, all 6 should be detailing services. NEVER include landscaping, seasonal cleanup, or outdoor lighting unless the business IS a landscaper.

Keep copy casual and confident — these are working tradespeople, not corporate brands.`;

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
  let biz, name, phone, rating, reviews, address;

  if (isDemo) {
    // Generic demo mode — no Google lookup needed
    name = bizQuery;
    phone = '(555) 123-4567';
    rating = '4.9';
    reviews = 47;
    address = fallbackCity || 'Seattle, WA';
    biz = {
      displayName: { text: name },
      formattedAddress: address,
      nationalPhoneNumber: phone,
      rating: parseFloat(rating),
      userRatingCount: reviews,
      types: [],
      reviews: []
    };
    console.log(`\n🎨 Creating category demo: "${name}" (${address})`);
  } else {
    console.log(`\n🔍 Looking up "${bizQuery}"...`);
    biz = await findBusiness(bizQuery, fallbackCity);
    if (!biz) {
      console.error('❌ Business not found on Google. Try a more specific name or add the city.');
      console.error('   Tip: Use --demo flag to create a generic category demo.');
      process.exit(1);
    }
    name = biz.displayName?.text || bizQuery;
    phone = biz.nationalPhoneNumber || '(000) 000-0000';
    rating = biz.rating || '5.0';
    reviews = biz.userRatingCount || 0;
    address = biz.formattedAddress || '';

    console.log(`✅ Found: ${name}`);
    console.log(`   📍 ${address}`);
    console.log(`   📞 ${phone}`);
    console.log(`   ⭐ ${rating} (${reviews} reviews)\n`);
  }

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
    'notary': 'fresh-clean',
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

  // Enable chat widget — use "demo" business for demo mode, actual slug for real leads
  const widgetBiz = isDemo ? 'demo' : slug;
  const serverUrl = 'https://frontdesk-ai-vx1s.onrender.com';
  // Handle both attribute orderings in templates
  html = html.replace(
    /<!--\s*<script src="[^"]*\/widget\/frontdesk-widget\.js"[^>]*><\/script>\s*-->/,
    `<script src="${serverUrl}/widget/frontdesk-widget.js" data-business="${widgetBiz}" data-server="${serverUrl}"></script>`
  );

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
      'clean':   'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80',
      // Tree trades (bold-trade template)
      'tree':    'https://images.unsplash.com/photo-1754321889123-0485c7fea5f1?w=1600&q=80',
      'arborist':'https://images.unsplash.com/photo-1754321889123-0485c7fea5f1?w=1600&q=80',
      // Junk / hauling trades (bold-trade template)
      'junk':    'https://images.unsplash.com/photo-1628464682320-6a9ae020cb2b?w=1600&q=80',
      'haul':    'https://images.unsplash.com/photo-1628464682320-6a9ae020cb2b?w=1600&q=80',
      'removal': 'https://images.unsplash.com/photo-1628464682320-6a9ae020cb2b?w=1600&q=80',
      // Locksmith
      'lock':    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=80',
      'key':     'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=80',
      // Auto detailing
      'detail':  'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=1600&q=80',
      'auto':    'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=1600&q=80',
      // Notary
      'notary':  'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80',
      'sign':    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80',
      // Concrete / paving
      'concrete':'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
      'pav':     'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
      // Landscaping
      'landscap':'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1600&q=80',
      'lawn':    'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1600&q=80',
      // Painting
      'paint':   'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1600&q=80',
      // Roofing
      'roof':    'https://images.unsplash.com/photo-1632759145351-1d592919f522?w=1600&q=80',
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

  // Replace services section header
  if (content.servicesTitle) {
    html = html.replace(/(data-i18n="servicesTitle">)[^<]*/, `$1${content.servicesTitle}`);
  }
  if (content.servicesText) {
    html = html.replace(/(data-i18n="servicesText">)[^<]*/, `$1${content.servicesText}`);
  }

  // Replace ALL 6 services (titles, text, AND icons)
  const svcReplacements = [
    ['svc1Title', 'svc1Text', 'svc1Icon'],
    ['svc2Title', 'svc2Text', 'svc2Icon'],
    ['svc3Title', 'svc3Text', 'svc3Icon'],
    ['svc4Title', 'svc4Text', 'svc4Icon'],
    ['svc5Title', 'svc5Text', 'svc5Icon'],
    ['svc6Title', 'svc6Text', 'svc6Icon'],
  ];
  for (const [titleKey, textKey, iconKey] of svcReplacements) {
    if (content[titleKey]) {
      html = html.replace(new RegExp(`(data-i18n="${titleKey}">)[^<]*`), `$1${content[titleKey]}`);
    }
    if (content[textKey]) {
      html = html.replace(new RegExp(`(data-i18n="${textKey}">)[^<]*`), `$1${content[textKey]}`);
    }
    if (content[iconKey]) {
      // Replace the icon in the service card preceding this title
      const iconRegex = new RegExp(`(<div class="service-icon"><i class="ph-fill )[^"]*("(?:><\/i>)?<\/div>\\s*(?:<\/div>\\s*)?\\s*<h3 data-i18n="${titleKey}")`, 's');
      html = html.replace(iconRegex, `$1${content[iconKey]}$2`);
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
  const bannerText = isDemo
    ? `✨ This could be <strong>your</strong> website — <a href="https://welcomematdigital.com/pitch" style="color:#0d9488; text-decoration:underline;">See how it works</a>`
    : `🎨 Preview for <strong>${name}</strong> — <a href="https://welcomematdigital.com/contact" style="color:#0d9488; text-decoration:underline;">Make it yours</a>`;
  html = html.replace('<body>', `<body>
  <div style="background:#f0fdf4; color:#1e293b; text-align:center; padding:5px 16px; font-size:11px; font-family:${bannerFont}; position:relative; z-index:1001; letter-spacing:0.3px; border-bottom:1px solid #d1fae5;">
    ${bannerText}
  </div>`);

  // Create output dir — demos go to public/demos/, real leads go to public/sites/
  const baseDir = isDemo ? 'demos' : 'sites';
  const outDir = path.join(__dirname, '..', 'public', baseDir, slug);
  
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

  console.log(`\n🎉 Demo site created!`);
  console.log(`   📁 public/${baseDir}/${slug}/index.html`);
  console.log(`   🌐 Local:  http://localhost:3001/${baseDir}/${slug}/`);
  console.log(`   🌐 Live:   https://welcomematdigital.com/${baseDir}/${slug}/`);
  if (!isDemo) {
    console.log(`\n   Send this link to ${name} when they respond to your text!\n`);
  } else {
    console.log(`\n   Use this demo link in outreach for ${content.trade} businesses!\n`);
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
