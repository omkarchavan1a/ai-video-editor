import { NextResponse } from "next/server";
import { chatComplete, safeJsonParse } from "@/lib/llm";
import { heuristicClips, buildEDL, type Word } from "@/lib/edl";
import { checkRate, limitedResponse, BUDGETS, WINDOW_MS } from "@/lib/rate-limit";
import { MAX_TRANSCRIPT_CHARS } from "@/lib/limits";

export const maxDuration = 60;

type Body = {
  sourceId?: string;
  words: Word[];
  prefs?: { targetLength?: number; count?: number; topic?: string; tone?: string };
  visualCues?: { t: number; note: string; energy: number }[];
};

// POST /api/llm/clips — transcript → ranked clip candidates (FR-CL-01..04)
export async function POST(req: Request) {
  const rl = checkRate(req, "llm:clips", BUDGETS.clips, WINDOW_MS);
  if (!rl.ok) return limitedResponse(rl.retryAfter);
  try {
    const body = (await req.json()) as Body;
    const words = body.words || [];
    if (!words.length) return NextResponse.json({ error: "empty transcript" }, { status: 400 });
    if (words.length > 20000) return NextResponse.json({ error: "Transcript too large (max 20k words)." }, { status: 413 });
    const prefs = body.prefs || {};
    const visualCues = body.visualCues || [];
    const sourceId = body.sourceId || "src_01";
    const transcript = words.map((w) => w.w).join(" ");
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return NextResponse.json({ error: "Transcript too large for analysis." }, { status: 413 });
    }
    const total = words[words.length - 1]?.e || 0;
    const visualLine = visualCues.length
      ? `Visual analysis (timestamps in seconds, energy 0-1): ${visualCues.map((v) => `${v.t.toFixed(0)}s energy=${v.energy} "${v.note.slice(0, 80)}"`).join("; ").slice(0, 2000)} Prefer clips overlapping high-energy visual moments.`
      : "";

    const prompt = `You are ShortForge clip finder. Source duration ${total.toFixed(1)}s. Preferences: ${JSON.stringify(prefs)}.
${visualLine}
Transcript (word timings omitted, sequential): """${transcript.slice(0, 12000)}"""
Task: propose ${prefs.count || 8} clips, each 15-90s, on natural sentence boundaries.
Score 0-100 on hook strength, self-containment, payoff, clean ending.
Return JSON ONLY: {"clips":[{"start_word":0,"end_word":40,"score":82,"reason":"...","hook":"...","title":"...","description":"...","hashtags":["#shorts"]}]}`;

    try {
      const raw = await chatComplete([
        { role: "system", content: "Return JSON only. No markdown." },
        { role: "user", content: prompt },
      ]);
      const parsed = safeJsonParse<{ clips: { start_word: number; end_word: number; score: number; reason: string; hook: string; title: string; description: string; hashtags: string[] }[] }>(raw, { clips: [] });
      if (parsed.clips?.length) {
        const clips = parsed.clips.slice(0, 20).map((c, i) => {
          const ws = words.slice(Math.max(0, c.start_word), Math.max(c.start_word + 1, c.end_word));
          if (!ws.length) return null;
          const start = Math.max(0, ws[0].s - 0.2);
          const end = ws[ws.length - 1].e + 0.3;
          return {
            id: `clip_${i}_${Math.round(start)}`,
            start, end, score: c.score, reason: c.reason, hook: c.hook,
            title: c.title, description: c.description, hashtags: c.hashtags || ["#shorts"],
            edl: buildEDL({ clip_id: `clip_${i}`, source_id: sourceId, start, end, words }),
          };
        }).filter(Boolean);
        if (clips.length) return NextResponse.json({ clips, provider: "llm" });
      }
    } catch (e) {
      console.error("LLM clips failed, heuristic fallback:", e);
    }
    return NextResponse.json({ clips: heuristicClips(sourceId, words, prefs.count || 8), provider: "heuristic" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
