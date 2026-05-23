#!/usr/bin/env node
// Add personalized outreach messages as a column in the leads CSV
// Usage: node tools/gen-texts.js [tools/leads-eastside.csv]

require('dotenv').config();
const fs = require('fs');

const csvPath = process.argv[2] || 'tools/leads-eastside.csv';

if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(csvPath, 'utf8').trim();
const lines = raw.split('\n');

// Simple CSV parser (handles quoted fields with commas)
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function escapeCSV(val) {
  const s = String(val);
  return '"' + s.replace(/"/g, '""') + '"';
}

const header = parseCSVLine(lines[0]);
const nameIdx = header.indexOf('Name');
const ratingIdx = header.indexOf('Rating');
const reviewsIdx = header.indexOf('Reviews');

// Remove old Message column if re-running
const msgIdx = header.indexOf('Message');
if (msgIdx !== -1) header.splice(msgIdx, 1);

const output = [];
output.push(header.join(',') + ',Message');

let count = 0;
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const fields = parseCSVLine(lines[i]);
  if (msgIdx !== -1) fields.splice(msgIdx, 1);

  const name = fields[nameIdx] || '';
  const rating = fields[ratingIdx] || '';
  const reviews = parseInt(fields[reviewsIdx] || '0');

  let reviewLine = '';
  if (rating && reviews > 0) {
    reviewLine = `I saw your great reviews — ${rating} stars with ${reviews} review${reviews === 1 ? '' : 's'} is no joke. `;
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const demoUrl = `welcomematdigital.com/sites/${slug}`;

  const msg = `Hi, I'm Sunil — I live in Sammamish and recently started helping local service businesses get set up online. I came across ${name} on Google. ${reviewLine}I noticed you don't have a website yet — I think a lot more customers could find you if you did. I actually put together a quick preview of what your site could look like: ${demoUrl} — Would you be open to chatting about how I can help with that? No pressure either way.`;

  const row = fields.map(f => escapeCSV(f)).join(',') + ',' + escapeCSV(msg);
  output.push(row);
  count++;
}

fs.writeFileSync(csvPath, '\uFEFF' + output.join('\n'), 'utf8');
console.log(`\n✅ Added "Message" column to ${csvPath} — ${count} messages generated.\n`);
