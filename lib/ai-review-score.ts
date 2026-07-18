import "server-only";

type ReviewScoreInput = {
  sentiment: "positive" | "negative";
  text: string;
  serviceTitle: string;
};

type GroqChatResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
};

function clampScore(score: number) {
  return Math.min(5, Math.max(1, Math.round(score * 10) / 10));
}

function parseScore(content?: string) {
  if (!content) {
    throw new Error("Groq returned empty score response.");
  }

  const parsed = JSON.parse(content) as { score?: number };

  if (typeof parsed.score !== "number" || !Number.isFinite(parsed.score)) {
    throw new Error("Groq score response did not include a numeric score.");
  }

  return clampScore(parsed.score);
}

export async function scoreReviewWithAI(input: ReviewScoreInput) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_REVIEW_MODEL ?? "llama-3.3-70b-versatile",
      temperature: 0,
      max_completion_tokens: 80,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You score Indonesian digital product/service reviews. Return only valid JSON with this shape: {\"score\": number}. The score is 1.0 to 5.0. Use the stated sentiment and review text. Positive reviews usually score 3.6-5.0, negative reviews usually score 1.0-3.0, but nuanced text can adjust the score. Do not add explanations.",
        },
        {
          role: "user",
          content: JSON.stringify({
            serviceTitle: input.serviceTitle,
            sentiment: input.sentiment,
            reviewText: input.text,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq scoring failed with status ${response.status}.`);
  }

  const data = (await response.json()) as GroqChatResponse;

  return parseScore(data.choices?.[0]?.message?.content);
}

export function calculateServiceRatingSnapshot(scores: number[]) {
  if (!scores.length) {
    return 0;
  }

  return clampScore(scores.reduce((total, score) => total + score, 0) / scores.length);
}
