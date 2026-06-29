import { createHmac, timingSafeEqual } from "crypto"
import { db } from "./db"
import { users } from "./schema"
import { eq } from "drizzle-orm"

export interface TgUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

export interface TgInitData {
  user?: TgUser
  chat?: { id: number; type: string }
  chat_type?: string
  chat_instance?: string
  start_param?: string
  auth_date: number
  hash: string
  query_id?: string
}

function urlSafeDecode(str: string): string {
  return str.replace(/%21/g, "!").replace(/%2A/g, "*").replace(/%27/g, "'").replace(/%28/g, "(").replace(/%29/g, ")")
}

function parseInitData(raw: string): Record<string, string> {
  const params: Record<string, string> = {}
  for (const pair of raw.split("&")) {
    const eq = pair.indexOf("=")
    if (eq < 0) continue
    const key = decodeURIComponent(pair.slice(0, eq))
    const value = decodeURIComponent(pair.slice(eq + 1))
    params[key] = value
  }
  return params
}

export function validateInitData(raw: string, botToken: string): TgInitData | null {
  const params = parseInitData(raw)
  const hash = params.hash
  if (!hash) return null

  const checkArr: string[] = []
  for (const key of Object.keys(params).sort()) {
    if (key === "hash") continue
    checkArr.push(`${key}=${urlSafeDecode(params[key])}`)
  }
  const checkStr = checkArr.join("\n")

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest()
  const computed = createHmac("sha256", secret).update(checkStr).digest("hex")

  if (computed !== hash) {
    try {
      const computedBuf = Buffer.from(computed, "hex")
      const hashBuf = Buffer.from(hash, "hex")
      if (!timingSafeEqual(computedBuf, hashBuf)) return null
    } catch {
      return null
    }
  }

  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    try {
      data[key] = JSON.parse(value)
    } catch {
      data[key] = value
    }
  }

  return data as unknown as TgInitData
}

export function extractUser(initData: TgInitData): TgUser | null {
  return initData.user ?? null
}

export async function findUser(tgUser: TgUser) {
  return db
    .select()
    .from(users)
    .where(eq(users.telegramId, tgUser.id))
    .then((r) => r[0] ?? null)
}

export async function findOrCreateUser(tgUser: TgUser) {
  let user = await findUser(tgUser)

  if (!user) {
    const [created] = await db
      .insert(users)
      .values({
        telegramId: tgUser.id,
        telegramUsername: tgUser.username ?? null,
        fullName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" "),
        avatarUrl: tgUser.photo_url ?? null,
      })
      .returning()
    user = created
  }

  return user
}
