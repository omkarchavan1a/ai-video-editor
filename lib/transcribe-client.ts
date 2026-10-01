"use client";
// Browser transcription: tries server STT (OpenAI/Groq if configured),
// else on-device whisper via transformers.js (lazy), else sample/paste fallback.

import type { Word } from "./edl";

export async function transcribeViaServer(audio: Blob, language?: string): Promise<Word[] | null> {
  try {
    const fd = new FormData();
    fd.append("audio", audio, "audio.webm");
    if (language) fd.append("language", language);
    const res = await fetch("/api/transcribe", { method: "POST", body: fd });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.words as Word[]) || null;
  } catch { return null; }
}

export async function transcribeOnDevice(
  audioUrl: string, onProgress?: (p: number) => void
): Promise<Word[]> {
  // Lazy-load transformers only when needed via CDN (keeps Vercel build small,
  // avoids bundling onnxruntime-node native binaries).
  const CDN = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js";
  const mod = (await import(/* webpackIgnore: true */ CDN).catch(() => null)) as { pipeline?: unknown } | null;
  const pipeline = (mod as { pipeline?: (task: string, model: string) => Promise<(input: string, opts: object) => Promise<{ chunks?: { timestamp: [number, number]; text: string }[] }>> })?.pipeline;
  if (!pipeline) throw new Error("on-device lib unavailable (CDN blocked?)");
  onProgress?.(10);
  const asr = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en");
  onProgress?.(40);
  const out = await asr(audioUrl, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true }) as { chunks?: { timestamp: [number, number]; text: string }[] };
  onProgress?.(85);
  const chunks: { timestamp: [number, number]; text: string }[] = out.chunks || [];
  const words: Word[] = [];
  for (const c of chunks) {
    const [s, e] = c.timestamp;
    const parts = c.text.trim().split(/\s+/).filter(Boolean);
    const dur = Math.max(0.01, (e - s) / Math.max(1, parts.length));
    parts.forEach((w, i) => words.push({ w, s: s + i * dur, e: s + (i + 1) * dur }));
  }
  onProgress?.(100);
  return words;
}

export function extractAudioTrack(videoBlob: Blob): Promise<Blob> {
  // MVP: send the container itself; server/whisper handles demux. No FFmpeg needed.
  return Promise.resolve(videoBlob);
}
