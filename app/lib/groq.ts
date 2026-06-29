const GROQ_API = "https://api.groq.com/openai/v1/chat/completions"
const MODEL = "llama-3.3-70b-versatile"

interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export async function groqChat(messages: Message[], signal?: AbortSignal) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("Missing GROQ_API_KEY")

  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 512,
      top_p: 0.9,
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ""
}
