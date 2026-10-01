// Unified LLM client: Nvidia Build (primary) with Mistral direct fallback.
// Both are OpenAI-compatible /chat/completions. Auto-detects provider from key.

export function llmConfig() {
  const apiKey = process.env.LLM_API_KEY || "";
  let baseUrl = process.env.LLM_BASE_URL || "https://integrate.api.nvidia.com/v1";
  let model = process.env.LLM_MODEL || "meta/llama-3.1-70b-instruct";
  // Key you pasted (mstrl_...) is Mistral AI, not Nvidia — auto-route it.
  if (apiKey.startsWith("mstrl_") && !process.env.LLM_BASE_URL) {
    baseUrl = "https://api.mistral.ai/v1";
    model = process.env.LLM_MODEL || "mistral-large-latest";
  }
  return { apiKey, baseUrl, model };
}

export async function chatComplete(messages: { role: string; content: string }[], jsonMode = true) {
  const { apiKey, baseUrl, model } = llmConfig();
  if (!apiKey) throw new Error("Missing LLM_API_KEY. Add Nvidia (nvapi-...) or Mistral (mstrl_...) key to .env.local");
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      response_format: jsonMode ? { type: "json_object" } : undefined,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return content as string;
}

export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1)) as T;
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
