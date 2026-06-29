# Tikep

**Tikep** — TikTok-like short-form video mini app inside Telegram. Built with Next.js 16, Postgres + Drizzle ORM, and Telegram Mini App.

## Features

- **Vertical feed** — infinite scroll with IntersectionObserver lazy load
- **Video & photo upload** — FFmpeg compression (H.264, CRF 28, ≤720p) for video, direct save for JPEG/PNG/WebP
- **Camera recording** — tap for photo, hold for video (max 30s), front/back camera switch
- **Interactions** — like, comment, save, follow, share
- **Telegram auth** — initData HMAC validation, no passwords, zero third-party auth
- **Onboarding flow** — new users must pick username/bio/avatar before using the app
- **Profile** — edit profile, avatar upload, tabs for posts and saved videos
- **Bot AI** — built-in Telegram bot powered by Groq (llama-3.3-70b-versatile, free), RAG from database, guard rails, bug report & feature request forwarding
- **Telegram theme** — CSS variables from `themeParams`

## Tech Stack

- **Framework**: Next.js 16.2.9 (App Router, TypeScript, Tailwind CSS v4, Turbopack)
- **Database**: PostgreSQL + Drizzle ORM (5 tables: users, videos, likes, comments, follows, saves)
- **Auth**: Stateless initData HMAC (no cookies, no sessions)
- **Media processing**: FFmpeg + FFprobe via fluent-ffmpeg
- **AI**: Groq API (`llama-3.3-70b-versatile`)
- **No backend** — Server Actions + Route Handlers only

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (local, no Docker)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Groq API Key (free from [console.groq.com](https://console.groq.com))
- FFmpeg installed on system

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials:
#   DATABASE_URL=postgres://user:pass@localhost:5432/tikep
#   TELEGRAM_BOT_TOKEN=your_bot_token
#   NEXT_PUBLIC_URL=https://your-ngrok-url.ngrok-free.app
#   GROQ_API_KEY=gsk_your_key

# Push database schema
npx drizzle-kit push

# Run dev server
npm run dev
```

### Bot Webhook

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${NEXT_PUBLIC_URL}/api/bot"
```

Then open via Telegram Mini App: `https://t.me/{your_bot_name}/{app_name}`

## Architecture

```
app/
├── actions/       # Server Actions (like, save, comment, follow, video)
├── api/           # Route Handlers (auth, register, profile, upload, share, bot, users)
├── components/    # Client components (feed, camera, nav, sheets, etc.)
├── lib/           # Shared utilities (db, schema, tg, groq, guards, rag, notify)
├── (main)/        # App group with bottom nav (Home, Upload, Profile)
├── onboarding/    # Full-screen onboarding (no bottom nav)
├── profile/[slug] # User profile pages
└── watch/[id]     # Video watch page
```

## Deployment

Deploy to any VPS:

1. Install PostgreSQL, clone repo, build, run with PM2
2. Set `NEXT_PUBLIC_URL` to production domain
3. BotFather `/setappname` for deep links
4. Set Telegram bot webhook
