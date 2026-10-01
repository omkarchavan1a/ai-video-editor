import { NextResponse } from "next/server";
import { chatComplete, safeJsonParse } from "@/lib/llm";

export const maxDuration = 30;

// POST /api/llm/script — idea → narrated script for faceless mode (FR-GEN-01)
export async function POST(req: Request) {
  try {
    const { topic } = (await req.json()) as { topic: string };
    if (!topic) return NextResponse.json({ error: "topic required" }, { status: 400 });
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
