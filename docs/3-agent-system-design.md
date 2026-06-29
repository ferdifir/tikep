# 3 AI Agent System — Hacker, Hipster, Hustler

> **Date:** 29 Jun 2026
> **Status:** Approved design, pre-implementation
> **Goal:** Transform bot from passive CS into 3 proactive AI co-founders

---

## 1. Concept

User bertindak sebagai **CEO**. Tiga AI Agent bertindak sebagai co-founders yang tiap hari memberikan laporan, kritik, dan saran dari perspektif masing-masing:

| Agent | Role | Tone | Fokus |
|---|---|---|---|
| **Hacker** | Technical Co-Founder | Direct, no-bullshit, precise | Error rate, disk, DB, security, infra, performance |
| **Hipster** | Design/UX Co-Founder | Passionate, user-empathy | UX flow, content quality, engagement patterns, trends |
| **Hustler** | Growth Co-Founder | Energetic, data-driven, pushy | DAU, signups, upload rate, viral loop, retention |

Setiap agent punya **system prompt tetap** + **konteks metrics real-time**. Mereka tidak saling comunicate — masing-masing独立 mengirim laporan ke chat developer.

---

## 2. Architecture

```
┌──────────────┐    06:00 daily     ┌──────────────────────┐
│  VPS Cron    │ ─── GET ───────→   │ /api/agents/brief    │
│  0 6 * * *   │    ?key={SECRET}   │  (validate key)      │
└──────────────┘                    └──────────┬───────────┘
                                               │
                                               ↓
                                    ┌──────────────────────┐
                                    │   queryMetrics()      │
                                    │  ─ DB (users, videos, │
                                    │    likes, comments,   │
                                    │    follows, saves)    │
                                    │  ─ Disk usage (df)    │
                                    └──────────┬───────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ↓                          ↓                          ↓
            ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
            │  Hacker      │          │  Hipster     │          │  Hustler     │
            │  → groqChat  │          │  → groqChat  │          │  → groqChat  │
            │    (prompt + │          │    (prompt + │          │    (prompt + │
            │     metrics) │          │     metrics) │          │     metrics) │
            │  → sendMsg   │          │  → sendMsg   │          │  → sendMsg   │
            │    ke dev    │          │    ke dev    │          │    ke dev    │
            └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
                   │                         │                         │
                   └─────────────────────────┼─────────────────────────┘
                                             ↓
                              ┌──────────────────────────────┐
                              │  Developer Chat (7764382006)  │
                              │  [Hacker][Hipster][Hustler]   │
                              │  3 pesan sequential           │
                              └──────────────────────────────┘
```

### Sequence per Agent

```
1. System prompt (personality, never changes)
2. + Metrics context (dinamis, dari DB)
3. → Groq API (model: llama-3.3-70b-versatile, max_tokens: 300, temp: 0.7)
4. → Send message via bot to developer chat
5. → Wait 500ms before next agent (rate limit)
```

---

## 3. Metrics Shape

```typescript
interface AgentContext {
  // Growth
  totalUsers: number
  newUsers24h: number
  totalVideos: number
  newVideos24h: number
  totalLikes: number
  totalComments: number
  totalFollows: number
  totalShares: number

  // Tech
  diskUsedGB: string
  diskFreeGB: string
  diskUsedPercent: number
  errors24h: number
  dbSizeMB: string

  // Engagement
  topVideo: { caption: string; likes: number } | null
  topCreator: { username: string; videos: number } | null

  // Context
  date: string
  daysSinceLaunch: number
}
```

---

## 4. System Prompts

### Hacker

```
You are the Hacker — Technical Co-Founder of Tikep, a TikTok-like short video app on Telegram.
You are direct, no-bullshit, and precise. You care about code quality, infrastructure,
performance, and security.

Given the metrics below, write a brief report (max 150 words) covering:
1. Current technical state (what's good, what's concerning)
2. Concrete recommendations (2-3 items) for the CEO

Focus on: disk usage, error rates, response time, database health, FFmpeg pipeline,
security concerns. Be honest — if something sucks, say it sucks.

Metrics context:
{metrics}
```

### Hipster

```
You are the Hipster — Design/UX Co-Founder of Tikep, a TikTok-like short video app on Telegram.
You are passionate about user experience, design trends, and emotional impact.
You notice what feels right and what feels off.

Given the metrics below, write a brief report (max 150 words) covering:
1. UX/design assessment (what's working, what's not)
2. Concrete recommendations (2-3 items) for the CEO

Focus on: onboarding flow, upload experience, feed engagement, visual polish,
content quality trends, user behavior patterns. Think about what makes users
stay or leave.

Metrics context:
{metrics}
```

### Hustler

```
You are the Hustler — Growth Co-Founder of Tikep, a TikTok-like short video app on Telegram.
You are energetic, data-driven, and always pushing for growth.
You see opportunities everywhere.

Given the metrics below, write a brief report (max 150 words) covering:
1. Growth assessment (metrics, trends, concerns)
2. Concrete recommendations (2-3 items) for the CEO

Focus on: user acquisition, activation, retention, viral loops, share behavior,
upload frequency, engagement rates. Always be thinking about the next growth
lever to pull.

Metrics context:
{metrics}
```

---

## 5. Endpoint

### `GET /api/agents/brief?key={SECRET}`

Triggered by VPS cron. Validates secret key, then:

1. `queryMetrics()` — pull all data from DB + disk
2. For each agent [hacker, hipster, hustler]:
   a. Build Groq prompt (system + metrics)
   b. Call `groqChat()`
   c. Call `notifyDev()` with result (prefixed by agent emoji)
   d. `await delay(500)` — avoid flood
3. Return `{ ok: true, agents: [...] }`

**Security:** Secret key stored in `.env` as `AGENTS_SECRET`. Key required as query param. If wrong/missing → 401.

---

## 6. VPS Cron Setup

```
# /etc/cron.d/tikep-agents
0 6 * * * root curl -s "https://linkjo.my.id/api/agents/brief?key=xxx" > /dev/null 2>&1
```

Atau via root crontab: `crontab -e`

---

## 7. Implementation Files

```
app/
  lib/agents/
    prompts.ts     → systemPromptHacker(), systemPromptHipster(), systemPromptHustler()
    metrics.ts     → queryMetrics(): Promise<AgentContext>
    reporter.ts    → runAgents(): void  (orchestrator)
  api/agents/brief/
    route.ts       → GET handler (validate key → runAgents → respond)
```

### Dependencies
- `app/lib/groq.ts` — sudah ada, reuse `groqChat()`
- `app/lib/notify.ts` — sudah ada, reuse `notifyDev()`
- `app/lib/db.ts` — sudah ada

### No New Dependencies
- Tidak perlu package tambahan
- Tidak perlu tabel DB baru
- Tidak perlu WebSocket atau background job

---

## 8. Error Handling

- Jika Groq API gagal (timeout/error): skip agent tersebut, lanjut ke agent berikutnya
- Jika query metrics gagal: kirim pesan error ke developer, jangan retry
- Jika send message gagal: skip, tidak perlu retry (akan terulang besok)
- Timeout per-Groq call: 10 detik (AbortSignal)

---

## 9. Future Scope (Not in MVP)

- `/hacker`, `/hipster`, `/hustler` command di bot — on-demand agent chat
- Agent bisa "reply" ke laporan agent lain (diskusi multi-agent)
- Weekly summary instead of daily
- Agent bisa trigger action (e.g., "Hacker detected high error rate → auto-restart")
