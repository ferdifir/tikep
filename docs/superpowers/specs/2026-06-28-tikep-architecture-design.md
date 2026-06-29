# Tikep Architecture Design

TikTok-like short-form video mini app inside Telegram.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 — App Router |
| Language | TypeScript (strict) |
| Style | Tailwind CSS v4 |
| Database | Postgres + Drizzle ORM |
| Auth | Telegram initData (HMAC-SHA256) |
| Video storage | Local filesystem (`public/uploads/`) |
| API | Server Actions + Route Handlers |
| Client state | React `useState` / `useTransition` |

## Features (MVP)

| Feature | Approach |
|---------|----------|
| Feed | Server component, server-rendered list of videos. Snap-scroll client wrapper |
| Like | Server Action toggle row. Optimistic update via `useTransition` |
| Comment | Server Action insert row. `revalidatePath` on submit |
| Follow | Server Action toggle row |
| Profile | Server component, query user + their videos by `telegram_id` |
| Upload | Route Handler `POST /api/upload` — multipart → filesystem + DB insert |
| Share | `Telegram.WebApp.shareMessage()` — native share dialog |
| Auth | initData validated in middleware/utils, auto upsert user, JWT cookie |
| Theme | `Telegram.WebApp.themeParams` → CSS variables via TGProvider |
| Inbox/DM | Removed. Users DM the bot natively in Telegram |

## Project Structure

```
app/
├── (main)/                    # route group with bottom nav
│   ├── page.tsx               # feed (server component)
│   └── profile/page.tsx       # own profile
├── profile/[slug]/page.tsx    # other user profile
├── upload/page.tsx            # video upload form
├── components/
│   ├── feed-item.tsx          # feed card (client)
│   ├── comment-sheet.tsx      # comment bottom sheet
│   ├── bottom-nav.tsx         # bottom navigation bar
│   └── tg-provider.tsx        # Telegram initData + theme provider
├── actions/
│   ├── like.ts                # Server Action: toggle like
│   ├── comment.ts             # Server Action: post comment
│   └── follow.ts              # Server Action: toggle follow
├── api/
│   ├── auth/route.ts          # Route Handler: validate initData, return user
│   └── upload/route.ts        # Route Handler: multipart upload
├── lib/
│   ├── db.ts                  # Drizzle client init
│   ├── tg.ts                  # initData validation + HMAC
│   └── schema.ts              # Drizzle schema
├── layout.tsx                 # root layout
└── globals.css
```

Deleted: `app/(main)/inbox/`, `app/inbox/`, `app/data.ts`, unused static SVGs.

## Database Schema

```sql
users
  id            serial PK
  telegram_id   bigint UNIQUE NOT NULL
  username      text
  full_name     text
  bio           text DEFAULT ''
  avatar_url    text
  created_at    timestamp DEFAULT now()

videos
  id            serial PK
  user_id       int NOT NULL → users.id
  caption       text
  file_path     text NOT NULL
  duration      int DEFAULT 0   -- seconds, max 30
  created_at    timestamp DEFAULT now()

likes
  user_id       int NOT NULL → users.id
  video_id      int NOT NULL → videos.id
  PRIMARY KEY (user_id, video_id)

comments
  id            serial PK
  user_id       int NOT NULL → users.id
  video_id      int NOT NULL → videos.id
  text          text NOT NULL
  created_at    timestamp DEFAULT now()

follows
  follower_id   int NOT NULL → users.id
  following_id  int NOT NULL → users.id
  PRIMARY KEY (follower_id, following_id)
```

## Data Fetching & Revalidation

### Feed
- Server component at `(main)/page.tsx`
- Query: `SELECT videos.*, users.*, count(likes) FROM videos JOIN users LEFT JOIN likes GROUP BY ... ORDER BY created_at DESC`

### Mutations via Server Actions
- Like → `likeAction(videoId: number)` → upsert/delete in `likes` → `revalidatePath('/')`
- Comment → `commentAction(videoId: number, text: string)` → insert in `comments` → `revalidatePath('/')`
- Follow → `followAction(username: string)` → insert/delete in `follows` → `revalidatePath(path)`

### Upload via Route Handler
- `POST /api/upload` → validate auth → accept FormData → validate file → save to `/public/uploads/{userId}/` → insert `videos` row → return `{ id, url }`

## Telegram Integration

### Auth flow
1. `TGProvider` reads `window.Telegram.WebApp.initData` on mount
2. TGProvider calls `POST /api/auth` with initData
3. Route Handler validates HMAC-SHA256 signature with `TELEGRAM_BOT_TOKEN`
4. User upserted by `telegram_id` into `users`
5. Route Handler returns `{ user }` — client stores in React context
6. Server Actions receive initData as a hidden form field and validate it internally via `lib/tg.ts`
7. No cookies, no middleware — stateless auth per request

### initData in Server Actions
Each Server Action accepts `initData: string` as a parameter (submitted as hidden form input by `TGProvider`). The action validates initData, extracts `user.id` from it, and uses that for DB operations. This avoids cookie/session complexity in Telegram WebView.

### Theme
- `TGProvider` reads `Telegram.WebApp.themeParams` on mount
- Maps `bg_color`, `text_color`, `button_color`, etc. to CSS variables on `:root`
- Components use `var(--tg-theme-bg-color)` instead of hardcoded Tailwind values

### Back button
- `Telegram.WebApp.BackButton.show()` + `.onClick()` on profile detail / comment sheet pages

### Share
- Replace custom share icon handler with `Telegram.WebApp.shareMessage(msg_id)`

### Haptic feedback
- `Telegram.WebApp.HapticFeedback.impactOccurred("medium")` on like toggle

## File Layout Decisions

- **`(main)` route group** — pages that show the BottomNav (feed, upload, own profile)
- **`profile/[slug]`** — outside `(main)` group so no BottomNav, uses root layout only
- **`/api/upload`** as a Route Handler (not Server Action) because file upload via Server Action is more complex and less reliable for large files
- **`lib/tg.ts`** shared auth utility importable by actions and route handlers
- **`/api/auth`** route handler — called once by client on mount to validate initData and get user info. After that, initData is passed to Server Actions directly

## Scope Exclusions (not in MVP)

- Real-time notifications / WebSocket
- Video transcoding (upload H.264, direct browser playback)
- Push notifications via Telegram Bot API
- Edit/delete video
- Admin panel
- Search / explore
- Stories
- Payments / Telegram Stars
