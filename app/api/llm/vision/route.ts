import { NextResponse } from "next/server";
import { llmConfig } from "@/lib/llm";
import { checkRate, limitedResponse, BUDGETS, WINDOW_MS } from "@/lib/rate-limit";
import { MAX_VISION_FRAMES, MAX_FRAME_BYTES } from "@/lib/limits";

export const maxDuration = 60;

// POST /api/llm/vision — frames → per-frame energy/moment notes.
// Uses Nvidia vision model; heuristic fallback (even spacing) when no key.
export async function POST(req: Request) {
  const rl = checkRate(req, "llm:vision", BUDGETS.vision, WINDOW_MS);
  if (!rl.ok) return limitedResponse(rl.retryAfter);
  try {
    const { frames } = (await req.json()) as { frames: { t: number; jpg: string }[] };
    if (!frames?.length) return NextResponse.json({ cues: [] });
    if (frames.length > MAX_VISION_FRAMES) return NextResponse.json({ error: `Max ${MAX_VISION_FRAMES} frames per request.` }, { status: 413 });
    if (frames.some((f) => (f.jpg || "").length > MAX_FRAME_BYTES)) {
      return NextResponse.json({ error: "Frame image too large. Use smaller frames." }, { status: 413 });
    }
    const { apiKey, baseUrl } = llmConfig();
    const model = process.env.LLM_VISION_MODEL || "meta/llama-3.2-11b-vision-instruct";
    if (!apiKey || apiKey.startsWith("mstrl_")) {
      // Mistral key can't do Nvidia vision — return neutral cues so pipeline continues.
      return NextResponse.json({
        cues: frames.map((f) => ({ t: f.t, note: "visual: speaker shot", energy: 0.6 })),
        provider: "heuristic",
      });
    }
    const content: unknown[] = [{ type: "text", text: "For each image (in order, timestamps given), rate short-form energy 0-1 and note what's on screen (speaker emotion, action, text on screen). Return JSON ONLY: {\"cues\":[{\"t\":<timestamp echoed>,\"note\":\"...\",\"energy\":0.8}]}" }];
    for (const f of frames.slice(0, 8)) {
      (content as unknown[]).push({ type: "text", text: `Frame at ${f.t.toFixed(1)}s:` });
      (content as unknown[]).push({ type: "image_url", image_url: { url: f.jpg } });
    }
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content }], temperature: 0.3, max_tokens: 800 }),
    });
    if (!res.ok) throw new Error(`vision ${res.status}`);
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || "{}";
    const start = text.indexOf("{"); const end = text.lastIndexOf("}");
    const parsed = start >= 0 ? JSON.parse(text.slice(start, end + 1)) : { cues: [] };
    const cues = (parsed.cues || []).map((c: { t: number; note: string; energy: number }, i: number) => ({
      t: typeof c.t === "number" ? c.t : frames[i]?.t || 0,
      note: String(c.note || "visual moment"),
      energy: Math.min(1, Math.max(0, Number(c.energy ?? 0.5))),
    }));
    return NextResponse.json({ cues, provider: "vision-llm" });
  } catch (e) {
    console.error("vision failed:", e);
    return NextResponse.json({ cues: [], provider: "off" });
  }
}
