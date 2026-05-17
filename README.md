# FrontDesk AI

AI-powered chat widget for local businesses. Customers get instant answers about your menu, hours, reservations, and more — 24/7, right on your website.

## How It Works

1. **You sign up** — we learn your business (menu, hours, policies, vibe)
2. **We build your AI** — a custom chatbot trained on your specific info
3. **Paste one line of code** — the chat widget appears on your site
4. **Customers get instant answers** — no more missed calls or unanswered DMs

## Quick Start

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# Clone
git clone https://github.com/sunilmsft/frontdesk-ai.git
cd frontdesk-ai

# Install
npm install

# Configure
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run
npm start
```

Open http://localhost:3001 to see the demo — a fake restaurant website ("The Plateau Kitchen") with the chat widget in the bottom-right corner.

## Adding the Widget to Any Website

Add this single script tag before `</body>`:

```html
<script src="https://your-server.com/widget/frontdesk-widget.js"
        data-business="your-business-slug"
        data-server="https://your-server.com"></script>
```

That's it. A chat bubble appears in the bottom-right corner.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a customer message, get AI reply |
| GET | `/api/business/:slug` | Get business info for widget config |
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/businesses` | List all businesses |
| POST | `/api/admin/businesses` | Add a new business |
| GET | `/api/admin/conversations/:businessId` | Recent conversations |
| GET | `/api/admin/conversation/:id/messages` | Full message thread |

## Project Structure

```
frontdesk-ai/
├── server/
│   ├── index.js              # Express entry point
│   ├── db/database.js         # SQLite schema + connection
│   ├── routes/
│   │   ├── chat.js            # Chat API (Claude integration)
│   │   └── admin.js           # Admin/dashboard API
│   └── prompts/
│       └── plateau-kitchen.txt  # Demo restaurant prompt
├── public/
│   ├── index.html             # Demo restaurant website
│   └── widget/
│       └── frontdesk-widget.js  # Embeddable chat widget
├── .env.example
├── .gitignore
└── package.json
```

## Pricing (Planned)

- **Free 30-day pilot** — we set everything up, you try it risk-free
- **$199/mo** — unlimited conversations, custom AI personality, analytics dashboard

## Target Market

Starting in Eastside Seattle (Sammamish, Redmond, Bellevue) — restaurants, salons, auto shops, any local business that gets repeat questions.

## Tech Stack

- **Backend:** Node.js + Express
- **AI:** Claude (Anthropic) — fast, accurate, stays on-topic
- **Database:** SQLite (via better-sqlite3)
- **Widget:** Vanilla JS — zero dependencies, works on any website
- **Hosting:** Render (free tier to start)

## License

MIT
