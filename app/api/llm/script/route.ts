import { NextResponse } from "next/server";
import { chatComplete, safeJsonParse } from "@/lib/llm";
import { checkRate, limitedResponse, BUDGETS, WINDOW_MS } from "@/lib/rate-limit";

export const maxDuration = 30;

// POST /api/llm/script — idea → narrated script for faceless mode (FR-GEN-01)
export async function POST(req: Request) {
  const rl = checkRate(req, "llm:script", BUDGETS.script, WINDOW_MS);
  if (!rl.ok) return limitedResponse(rl.retryAfter);
  try {
    const { topic } = (await req.json()) as { topic: string };
    if (!topic) return NextResponse.json({ error: "topic required" }, { status: 400 });
    if (topic.length > 500) return NextResponse.json({ error: "Topic too long (max 500 chars)." }, { status: 413 });
    const raw = await chatComplete([
      { role: "system", content: "Return JSON only." },
      { role: "user", content: `Write a 45-second faceless-short script about: "${topic}". Return JSON: {"script":"...","scenes":[{"text":"...","visual":"..."} x5],"title":"...","hashtags":["#shorts"]}` },
    ]);
    return NextResponse.json(safeJsonParse(raw, { script: "", scenes: [] }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
