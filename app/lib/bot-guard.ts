const MAX_TEXT_LENGTH = 1000
const RATE_WINDOW = 3000
const rateMap = new Map<number, number>()

export function checkText(text: string): string | null {
  if (!text.trim()) return "No message"
  if (text.length > MAX_TEXT_LENGTH) return `Message too long (max ${MAX_TEXT_LENGTH} chars)`
  return null
}

export function checkRateLimit(userId: number): string | null {
  const last = rateMap.get(userId)
  const now = Date.now()
  if (last && now - last < RATE_WINDOW) {
    return "Too fast — please wait a moment"
  }
  rateMap.set(userId, now)
  return null
}

export function sanitizeOutput(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim()
    .slice(0, 2000)
}
