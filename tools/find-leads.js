#!/usr/bin/env node
// Find local businesses WITHOUT websites using Google Places API
// Usage: node tools/find-leads.js "handyman" "Sammamish, WA"
//        node tools/find-leads.js "pressure washing" "Issaquah, WA" --csv

require('dotenv').config();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const trade = process.argv[2];
const location = process.argv[3];
const wantCSV = process.argv.includes('--csv');

if (!trade || !location) {
  console.log(`
  🔍 WelcomeMat Lead Finder
  
  Find local businesses that don't have a website yet.

  Usage:
    node tools/find-leads.js "<trade>" "<city, state>"
    node tools/find-leads.js "<trade>" "<city, state>" --csv

  Examples:
    node tools/find-leads.js "handyman" "Sammamish, WA"
    node tools/find-leads.js "house painter" "Kirkland, WA"
    node tools/find-leads.js "pressure washing" "Redmond, WA" --csv

  Good trades to search:
    handyman, house painter, pressure washing, fence repair,
    gutter cleaning, tree trimming, junk removal, carpet cleaning,
    mobile car detailing, locksmith, landscaping
  `);
  process.exit(0);
}

if (!API_KEY) {
  console.error('\n❌ Missing GOOGLE_PLACES_API_KEY in .env file');
  console.error('   Get one at: https://console.cloud.google.com/apis/credentials');
  console.error('   Enable "Places API (New)" in your project.\n');
  process.exit(1);
}

async function textSearch(query) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.businessStatus',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'en' }),
  });
  const data = await res.json();
  if (data.error) {
    console.error('Search failed:', data.error.message);
    process.exit(1);
  }
  return data.places || [];
}

async function main() {
  const query = `${trade} near ${location}`;
  console.log(`\n🔍 Searching: "${query}"...\n`);

  const places = await textSearch(query);

  if (places.length === 0) {
    console.log('No businesses found. Try a different trade or location.\n');
    return;
  }

  // Filter: no website and not permanently closed
  const leads = places
    .filter(p => !p.websiteUri && p.businessStatus !== 'CLOSED_PERMANENTLY')
    .map(p => ({
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      phone: p.nationalPhoneNumber || '',
      rating: p.rating || '',
      reviews: p.userRatingCount || 0,
      maps: p.googleMapsUri || '',
    }));

  console.log(`   Found ${places.length} businesses. ${leads.length} have no website.\n`);

  if (leads.length === 0) {
    console.log('✅ Every business in this search already has a website.');
    console.log('   Try a different trade or a smaller city.\n');
    return;
  }

  // CSV output
  if (wantCSV) {
    console.log('Name,Address,Phone,Rating,Reviews,Google Maps');
    for (const l of leads) {
      const row = [l.name, l.address, l.phone, l.rating, l.reviews, l.maps]
        .map(v => `"${String(v).replace(/"/g, '""')}"`);
      console.log(row.join(','));
    }
    console.log(`\n# ${leads.length} leads from ${places.length} results`);
    return;
  }

  // Pretty output
  console.log(`🎯 ${leads.length} businesses WITHOUT a website:\n`);
  console.log('─'.repeat(60));

  for (let i = 0; i < leads.length; i++) {
    const l = leads[i];
    console.log(`${i + 1}. ${l.name}`);
    console.log(`   📍 ${l.address}`);
    if (l.phone) console.log(`   📞 ${l.phone}`);
    if (l.rating) console.log(`   ⭐ ${l.rating} (${l.reviews} reviews)`);
    console.log(`   🗺️  ${l.maps}`);
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`Total: ${leads.length} leads from ${places.length} results`);
  console.log(`Tip: Add --csv to pipe into a spreadsheet.\n`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
