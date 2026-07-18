# Tikep Database and Telegram Mini App Design

Date: 2026-07-18

## Goal

Move Tikep from demo-only `localStorage` state to a server-backed data model using SQLite, while preparing the app to run as a Telegram Mini App. The first database implementation should stay simple enough for local development, but keep clear migration paths to Postgres or another hosted database later.

## Recommended Stack

- Database: SQLite
- ORM: Prisma
- API surface: Next.js App Router route handlers under `app/api`
- Auth identity: Telegram Mini App `initData`, validated on the server
- Local database file: `prisma/dev.db`
- Generated client: Prisma Client

Prisma is the recommended first step because it gives typed models, migrations, seed scripts, and a clean upgrade path if the project later moves from SQLite to Postgres.

## Data Model

### User

Represents a Telegram-backed user account.

Fields:
- `id`: internal UUID or cuid
- `telegramId`: unique Telegram user ID
- `username`
- `firstName`
- `lastName`
- `photoUrl`
- `languageCode`
- `createdAt`
- `updatedAt`

Relations:
- one user can own one or more providers
- one user can write reviews
- one user can recommend services
- one user can report services

### Provider

Represents a seller, studio, or creator profile.

Fields:
- `id`
- `ownerUserId`
- `slug`
- `name`
- `bio`
- `avatar`
- `avatarTone`
- `createdAt`
- `updatedAt`

Relations:
- belongs to a user when claimed
- has many services
- has many categories
- has many media items through services or direct showcase posts

### Category

Represents a product or service category. Categories are stored in the database instead of being hard-coded in the frontend.

Fields:
- `id`
- `providerId` nullable
- `createdByUserId` nullable
- `slug`
- `name`
- `isSystem`
- `createdAt`
- `updatedAt`

Relations:
- system categories have `isSystem = true` and no provider owner
- custom categories can belong to a provider or to the user who created them
- services belong to one category

Rules:
- Seed the current default categories: `Desain`, `Marketing`, `Teknologi`, and `Konten`.
- Users can create custom categories from the post flow or a category management UI.
- Category names should be unique within the same scope: system scope, provider scope, or user scope.
- A service must reference `categoryId`; the API can still return the display `category.name` for the current UI.
- System categories are available to every user.
- Custom categories are available to the owner and can be shown publicly when attached to a public service.

### Service

Represents a product or service listing.

Fields:
- `id`
- `providerId`
- `categoryId`
- `title`
- `price`
- `ratingSnapshot`
- `description`
- `iconName`
- `previewLabel`
- `createdAt`
- `updatedAt`

Relations:
- belongs to provider
- belongs to category
- has many reviews
- has many media items
- has many recommendations
- has many reports

`ratingSnapshot` is denormalized for fast feed rendering. It can be recalculated when reviews change.

### Media

Represents photo/video showcase content.

Fields:
- `id`
- `providerId` nullable
- `serviceId` nullable
- `authorUserId` nullable
- `isAnonymous`
- `caption` nullable
- `type`: `PHOTO` or `VIDEO`
- `url`
- `thumbnailUrl`
- `altText`
- `sortOrder`
- `createdAt`

Relations:
- optionally belongs to provider
- optionally belongs to a service
- optionally belongs to the Telegram user who posted it

Rules:
- Explore reads directly from this table and renders media-only masonry cards.
- The plus button in Explore creates standalone media, not a service/product listing.
- Uploaded files are stored under `public/uploads/media` for the local SQLite version.
- Anonymous media should not expose author text in API responses or previews.
- Non-anonymous media can expose the Telegram username in previews as `by @username`.
- Existing Unsplash demo covers stay in seed data as service-linked media until real uploads replace them.

### Review

Represents one user review for a service.

Fields:
- `id`
- `serviceId`
- `authorUserId`
- `sentiment`: `POSITIVE` or `NEGATIVE`
- `status`: `UNVERIFIED`, `PENDING`, `VERIFIED`, or `REJECTED`
- `verificationMethod`: `NONE`, `PROVIDER_CODE`, `PROOF_UPLOAD`, `EXTERNAL_LINK`, or `SEED`
- `reviewCodeId` nullable
- `text`
- `createdAt`

Rules:
- A service can have any mix of review sentiments.
- Cards show the two newest reviews by `createdAt`.
- Detail screens show all reviews newest first.
- Provider-issued review code reviews are saved as `VERIFIED`.
- Unverified review flows can exist later, but the rating shown to users should eventually favor verified reviews.

### ReviewCode

Represents a one-time provider-issued invite proving that a customer was served outside Tikep.

Fields:
- `id`
- `serviceId`
- `providerId`
- `createdByUserId`
- `usedByUserId` nullable
- `codeHash`
- `status`: `ACTIVE`, `USED`, or `EXPIRED`
- `customerChatId` nullable
- `sentAt` nullable
- `usedAt` nullable
- `expiresAt`
- `createdAt`

Rules:
- The raw code is never stored, only `codeHash`.
- A code can be used once.
- Codes expire after a bounded period, initially 30 days.
- If `customerChatId` is provided, the backend asks the Telegram Bot API to send the review link to that customer.
- If bot sending is not configured or fails, the provider still receives a shareable link.
- Review links open the Telegram Mini App with `startapp=review_<code>` when `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` is configured, or `/review?code=<code>` as browser fallback.
- The main provider UX should not ask for `chat_id` manually. Providers create a review link and share it through Telegram's share sheet or copy it manually. Direct bot sending remains an API capability for later flows where Tikep already knows the customer chat ID.

### Recommendation

Represents a user recommending a service.

Fields:
- `id`
- `serviceId`
- `userId`
- `createdAt`

Constraint:
- unique pair of `serviceId` and `userId`

### Report

Represents a user report against a service.

Fields:
- `id`
- `serviceId`
- `userId`
- `reason` nullable
- `createdAt`

Constraint:
- unique pair of `serviceId` and `userId`

### TelegramSession

Stores a validated Telegram Mini App session.

Fields:
- `id`
- `userId`
- `queryId`
- `authDate`
- `hash`
- `rawInitData`
- `createdAt`
- `expiresAt`

This table is optional for a simple first version, but useful for debugging and session expiry.

## API Design

Initial route handlers:

- `POST /api/telegram/session`
  - accepts raw `initData`
  - validates it with the bot token
  - upserts the Telegram user
  - returns the current user profile

- `GET /api/services`
  - returns feed services with provider, two newest reviews, recommendation/report state for current user

- `GET /api/services/[id]`
  - returns service detail with provider, media, and all reviews

- `POST /api/services`
  - creates a new service for the current user's provider
  - accepts `categoryId`

- `GET /api/categories`
  - returns system categories and custom categories available to the current user/provider

- `POST /api/categories`
  - creates a custom category for the current user or provider
  - rejects duplicate names within the same category scope

- `GET /api/providers/[slug]`
  - returns provider profile, services, media, and latest reviews

- `GET /api/media`
  - returns media feed for Explore

- `GET /api/media/[id]`
  - returns one media preview item

- `POST /api/media`
  - accepts `multipart/form-data` with a photo/video file
  - stores the uploaded file under `public/uploads/media`
  - creates a standalone `Media` row
  - supports `isAnonymous`; author user is only returned when media is non-anonymous

- `POST /api/services/[id]/recommend`
  - toggles recommendation for current user

- `POST /api/services/[id]/report`
  - creates a report for current user

- `POST /api/services/[id]/review-invites`
  - provider creates a one-time review code for a service
  - optionally accepts `customerChatId`
  - sends a Telegram bot message with a Mini App button when bot configuration is available
  - returns a Telegram Mini App link and browser fallback link

- `GET /api/reviews/invite?code=...`
  - validates a review invite code and returns service/provider context for the review form

- `POST /api/reviews/invite`
  - accepts `code`, `sentiment`, `text`, and optional Telegram `initData`
  - consumes the invite code once
  - creates a `VERIFIED` review with `verificationMethod = PROVIDER_CODE`

## Telegram Mini App Flow

1. Load Telegram Web App script in the document head.
2. Client reads `window.Telegram.WebApp.initData`.
3. Client sends raw `initData` to `POST /api/telegram/session`.
4. Server validates `initData` using `TELEGRAM_BOT_TOKEN`.
5. Server upserts user data from the validated payload.
6. UI uses the returned user and fetches personalized service/media data.

Important security rule: never trust `initDataUnsafe` for server-side decisions. The raw `initData` must be validated on the backend before using Telegram user data.

## Provider-Issued Review Flow

1. Provider opens one of their service previews.
2. Provider taps the invite review action.
3. Backend creates a one-time `ReviewCode`.
4. UI returns a Telegram Mini App review link and a browser fallback link.
5. Provider shares the link to the customer using Telegram share or copy link.
6. Mini App receives `startapp=review_<code>` or browser fallback `?code=<code>`.
7. Customer submits review.
8. Backend validates the code, validates Telegram `initData` when available, marks the code `USED`, and creates a `VERIFIED` review.

## Validation Algorithm

Server validation follows Telegram's Mini App data validation flow:

1. Parse `initData` as query string parameters.
2. Remove the `hash` field.
3. Sort remaining key-value pairs alphabetically.
4. Join pairs with newline characters to create `data_check_string`.
5. Derive the secret key from the bot token as documented by Telegram.
6. Compute HMAC-SHA256 and compare with the supplied `hash` using timing-safe comparison.
7. Reject stale sessions using `auth_date`.

`TELEGRAM_BOT_TOKEN` must only exist on the server, never in client code.

## Environment Variables

- `DATABASE_URL="file:./dev.db"`
- `TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` optional

## Migration Plan

### Phase 1: Add Database Foundation

- Install Prisma dependencies.
- Add `prisma/schema.prisma`.
- Add migration and seed script.
- Seed current demo categories, services, providers, media, and reviews.

### Phase 2: Add Read APIs

- Build read route handlers for services, service detail, providers, and media.
- Keep existing UI behavior, but switch read data from `localStorage` to API responses.

### Phase 3: Add Mutations

- Replace local recommendation/report state with API mutations.
- Replace post form local creation with `POST /api/services`.
- Replace hard-coded category list with `GET /api/categories`.
- Allow custom category creation with `POST /api/categories`.
- Recalculate or update service `ratingSnapshot` when reviews change.

### Phase 4: Add Telegram Session

- Add Telegram Web App script.
- Add client bootstrap for `initData`.
- Add server validation and user upsert.
- Gate mutations behind a validated Telegram user.

### Phase 5: Mini App Polish

- Use Telegram theme variables for colors where appropriate.
- Call `Telegram.WebApp.ready()` after initial render.
- Call `Telegram.WebApp.expand()` for the app shell.
- Respect viewport and safe area values for bottom navigation.

## Open Decisions

- Upload storage is not designed yet. SQLite stores URLs and metadata only.
- Provider claiming rules can start simple: one provider per Telegram user.
- Payments and Telegram Stars are out of scope for this design.
- Moderation workflow for reports is out of scope for the first database pass.

## References

- Telegram Mini Apps documentation: https://core.telegram.org/bots/webapps
- Next.js App Router route handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Prisma SQLite documentation: https://www.prisma.io/docs/orm/overview/databases/sqlite
