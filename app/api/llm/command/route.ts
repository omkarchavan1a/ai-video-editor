import { NextResponse } from "next/server";
import { chatComplete, safeJsonParse } from "@/lib/llm";
import type { EDL } from "@/lib/edl";

export const maxDuration = 30;

// POST /api/llm/command — "make captions yellow" → EDL patch (FR-ED-10)
export async function POST(req: Request) {
  try {
    const { edl, command } = (await req.json()) as { edl: EDL; command: string };
    if (!edl || !command) return NextResponse.json({ error: "edl + command required" }, { status: 400 });
    const raw = await chatComplete([
      { role: "system", content: "You edit video EDLs. Return JSON patch only. No markdown." },
      { role: "user", content: `Current EDL: ${JSON.stringify(edl).slice(0, 6000)}\nCommand: "${command}"\nReturn JSON patch with any of: trim_start (sec), trim_end (sec), aspect ("9:16"|"1:1"|"4:5"|"16:9"), captions {style}, overlays [{type:"text",text,s,e}], audio {music_id,ducking}. Example: {"trim_start":5,"captions":{"style":"neon"}}` },
    ]);
    const patch = safeJsonParse(raw, {});
    return NextResponse.json({ patch });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
