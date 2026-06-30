# Subscription Feature — Design Spec

## Overview

Add a paid subscription system (via Telegram Stars) where creators can mark videos as premium (subscriber-only) and earn recurring revenue. Inspired by Instagram/TikTok subscriptions.

---

## Database

### New Table

**`subscriptions`**

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` | PK |
| `subscriber_id` | `integer` | FK -> users.id ON DELETE CASCADE |
| `creator_id` | `integer` | FK -> users.id ON DELETE CASCADE |
| `telegram_payment_charge_id` | `text` | UNIQUE, dari Telegram |
| `start_date` | `timestamp` | |
| `end_date` | `timestamp` | |
| `active` | `boolean` | |
| `auto_renew` | `boolean` | default `true` |
| `created_at` | `timestamp` | default `now()` |

Index: `(subscriber_id, creator_id)` UNIQUE

### Modified Tables

**`videos`** — tambah kolom:
- `is_premium` (`boolean`, default `false`)

**`users`** — tambah kolom:
- `subscriber_count` (`integer`, default `0`)
- `subscription_price` (`integer`, nullable, 1–10000 Stars)
- `subscription_active` (`boolean`, default `false`) — creator toggle aktif/nonaktif

---

## Payment Flow (Telegram Stars)

```
User klik "Subscribe" di profile creator
  → POST /api/subscribe { creatorId }
  → Server: createInvoiceLink(currency="XTR", prices=[price_stars], payload={creatorId, subscriberId})
  → Return invoiceUrl
  → Client: WebApp.openInvoice(invoiceUrl, callback)
  → Telegram kirim pre_checkout_query ke bot webhook
  → Bot: validasi payload, answerPreCheckoutQuery(true)
  → Telegram kirim successful_payment
  → Bot: insert subscription row, update subscriber_count, notif creator
```

**Unsubscribe** (dari creator dashboard):
- `POST /api/subscribe/cancel { creatorId }` → `editUserStarSubscription(is_canceled=true)`
- Subscription tetap aktif sampai akhir periode (30 hari dari start_date)

**Expiry:**
- Server cron / on-demand check: `WHERE end_date < now() AND active = true`
- Set `active = false`

---

## Content Gating

### Feed
- Premium video tidak muncul di feed user yang tidak subscribe ke creatornya
- Filter di query feed: `WHERE (videos.is_premium = false OR subscriptions.active = true)`

### Profile Page
- Premium video tetap tampil di grid profile, dengan label/overlay "Premium"
- Klik video premium sebagai non-subscriber → modal/gate: "Subscribe mulai X Stars/bulan"
- Subscriber bisa putar seperti biasa

### Upload
- Toggle "Konten Premium" di halaman upload
- Creator bisa edit status premium video dari profile (video grid)

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/subscribe` | Init subscription → return invoiceUrl |
| `POST` | `/api/subscribe/cancel` | Cancel subscription |
| `GET` | `/api/subscriptions/:creatorId` | Cek status subscription current user |
| `GET` | `/api/dashboard` | Creator dashboard data |
| `PUT` | `/api/dashboard/plan` | Update subscription plan |
| `GET` | `/api/dashboard/subscribers` | Daftar subscriber |

## Bot Webhook Updates

**`app/api/bot/route.ts`** — tambah handler:
- `pre_checkout_query` — validasi, `answerPreCheckoutQuery(true)`
- `successful_payment` — activate subscription di DB

**Notifikasi:**
- Subscribe: `@{subscriber} started subscribing to you! 🌟` (ke creator)
- New subscriber welcome: `You are now subscribed to @{creator}! 🎉` (ke subscriber)

---

## Creator Dashboard

**Route:** `app/(main)/dashboard/`

**Komponen:**
- Stat card: Total subscriber, Revenue (Stars bulan ini & total)
- Daftar subscriber: username, join date, status (active/expired)
- Subscription settings: harga input, aktif/nonaktif toggle
- Tombol unsubscribe individual dari daftar subscriber

**Data:** query dari `subscriptions` + `users` tables.

---

## UI Components (New/Modified)

| Component | File | Changes |
|---|---|---|
| PremiumBadge | `app/components/premium-badge.tsx` | Label "Premium" untuk video |
| SubscribeButton | `app/components/subscribe-button.tsx` | Tombol subscribe (cek status, handle flow) |
| SubscriptionGate | `app/components/subscription-gate.tsx` | Modal/lock screen untuk non-subscriber |
| DashboardPage | `app/(main)/dashboard/page.tsx` | Creator dashboard |
| Upload (mod) | `app/(main)/upload/page.tsx` | Tambah toggle is_premium |
| FeedItem (mod) | `app/components/feed-item.tsx` | Filter premium, show/hide based on sub |
| FeedPage (mod) | `app/components/feed-page.tsx` | Filter premium dari feed query |
| Profile (mod) | `app/(main)/profile/page.tsx`, `app/profile/[slug]/page.tsx` | Label premium + gate |

---

## Non-Goals (Out of Scope for v1)

- Tiered pricing (multiple price levels)
- Subscriber-only broadcast channel / chat room
- Analytics dashboard advanced (charts, trends)
- Promo codes / free trial
- Payout/fiat withdrawal — Stars stay in Telegram balance

---

## Files Changed / Created

```
NEW  app/(main)/dashboard/page.tsx
NEW  app/(main)/dashboard/layout.tsx
NEW  app/components/premium-badge.tsx
NEW  app/components/subscribe-button.tsx
NEW  app/components/subscription-gate.tsx
NEW  app/api/subscribe/route.ts
NEW  app/api/subscribe/cancel/route.ts
NEW  app/api/subscriptions/[creatorId]/route.ts
NEW  app/api/dashboard/data/route.ts
NEW  app/api/dashboard/plan/route.ts
NEW  app/api/dashboard/subscribers/route.ts
MOD  app/lib/schema.ts
MOD  app/api/bot/route.ts
MOD  app/api/feed/route.ts
MOD  app/(main)/upload/page.tsx
MOD  app/(main)/page.tsx
MOD  app/components/feed-page.tsx
MOD  app/components/feed-item.tsx
MOD  app/(main)/profile/page.tsx
MOD  app/profile/[slug]/page.tsx
MOD  app/lib/types.ts
MOD  drizzle.config.ts  (jika perlu regenerate migration)
```
