import { NextResponse } from "next/server";
import type { Word } from "@/lib/edl";

export const maxDuration = 60;

// POST /api/transcribe — proxies to OpenAI/Groq Whisper if keys exist.
// No key on Vercel MVP → 501, client falls back to on-device whisper-tiny.
export async function POST(req: Request) {
  const openai = process.env.OPENAI_API_KEY;
  const groq = process.env.GROQ_API_KEY;
  if (!openai && !groq) {
    return NextResponse.json({ error: "no STT key; use on-device fallback", fallback: true }, { status: 501 });
  }
  try {
    const form = await req.formData();
    const audio = form.get("audio") as Blob | null;
    if (!audio) return NextResponse.json({ error: "audio required" }, { status: 400 });
    const out = new FormData();
    out.append("file", audio, "audio.webm");
    out.append("model", groq && !openai ? "whisper-large-v3" : "whisper-1");
    out.append("response_format", "verbose_json");
    out.append("timestamp_granularities[]", "word");
    const url = groq && !openai ? "https://api.groq.com/openai/v1/audio/transcriptions" : "https://api.openai.com/v1/audio/transcriptions";
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${groq && !openai ? groq : openai}` },
      body: out,
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const data = await res.json();
    const words: Word[] = (data.words || []).map((w: { word: string; start: number; end: number }) => ({ w: w.word, s: w.start, e: w.end }));
    return NextResponse.json({ words, language: data.language || "en" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "transcribe failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
