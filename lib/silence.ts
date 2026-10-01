"use client";
// Client-side silence detection via WebAudio (no server needed).
// Decodes the uploaded blob, finds quiet stretches > minLen under threshold.

export async function detectSilences(
  blob: Blob, opts: { threshold?: number; minLen?: number } = {}
): Promise<{ s: number; e: number }[]> {
  const threshold = opts.threshold ?? 0.02;
  const minLen = opts.minLen ?? 0.7;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const buf = await blob.arrayBuffer();
    const audio = await ctx.decodeAudioData(buf).catch(() => null);
    if (!audio) return [];
    const ch = audio.getChannelData(0);
    const sr = audio.sampleRate;
    const win = Math.floor(sr * 0.1); // 100ms windows
    const out: { s: number; e: number }[] = [];
    let quietStart: number | null = null;
    for (let i = 0; i < ch.length; i += win) {
      let peak = 0;
      for (let j = i; j < Math.min(i + win, ch.length); j += 4) peak = Math.max(peak, Math.abs(ch[j]));
      const t = i / sr;
      if (peak < threshold) {
        if (quietStart === null) quietStart = t;
      } else if (quietStart !== null) {
        if (t - quietStart >= minLen) out.push({ s: quietStart, e: t });
        quietStart = null;
      }
    }
    return out;
  } finally {
    void ctx.close().catch(() => {});
  }
}
