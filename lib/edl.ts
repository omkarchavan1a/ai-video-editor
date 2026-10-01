// Core EDL types (per FRD §12) + helpers. All video ops are EDL-driven.

export type Word = { w: string; s: number; e: number };
export type Segment = { src_start: number; src_end: number; speed?: number };
export type CropKey = { t: number; x: number; y: number; w: number; h: number };
export type EDL = {
  clip_id: string;
  source_id: string;
  aspect: "9:16" | "1:1" | "4:5" | "16:9";
  segments: Segment[];
  crop_track: CropKey[];
  captions: { style: string; words: Word[] };
  overlays: { type: string; text: string; s: number; e: number }[];
  audio: { music_id: string; ducking: boolean; lufs: number };
  brand_kit_id: string;
};

export type ClipCandidate = {
  id: string;
  start: number;
  end: number;
  score: number;
  reason: string;
  hook: string;
  title: string;
  description: string;
  hashtags: string[];
  edl: EDL;
};

export const CAPTION_PRESETS = [
  "bold-pop", "karaoke", "minimal", "neon", "submagic", "beast", "hormozi", "karaoke-box",
];

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

export function wordsInRange(words: Word[], start: number, end: number): Word[] {
  return words
    .filter((w) => w.e > start && w.s < end)
    .map((w) => ({ ...w, s: w.s - start, e: w.e - start }));
}

export function buildEDL(opts: {
  clip_id: string; source_id: string; start: number; end: number; words: Word[]; aspect?: EDL["aspect"];
}): EDL {
  const aspect = opts.aspect || "9:16";
  return {
    clip_id: opts.clip_id,
    source_id: opts.source_id,
    aspect,
    segments: [{ src_start: opts.start, src_end: opts.end, speed: 1 }],
    crop_track: [{ t: 0, x: 0.325, y: 0, w: 0.35, h: 1 }],
    captions: { style: "bold-pop", words: wordsInRange(opts.words, opts.start, opts.end) },
    overlays: [],
    audio: { music_id: "none", ducking: true, lufs: -14 },
    brand_kit_id: "default",
  };
}

// Heuristic fallback when LLM is unreachable: sentence-window scoring.
export function heuristicClips(sourceId: string, words: Word[], target = 8): ClipCandidate[] {
  if (!words.length) return [];
  const sentences: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (/[.!?]$/.test(w.w) || cur.length >= 28) { sentences.push(cur); cur = []; }
  }
  if (cur.length) sentences.push(cur);
  const out: ClipCandidate[] = [];
  for (let i = 0; i < sentences.length && out.length < target; i += 2) {
    const chunk = [...(sentences[i] || []), ...(sentences[i + 1] || [])];
    if (!chunk.length) continue;
    const start = Math.max(0, chunk[0].s - 0.3);
    const end = chunk[chunk.length - 1].e + 0.4;
    const dur = end - start;
    if (dur < 12 || dur > 95) continue;
    const text = chunk.map((w) => w.w).join(" ");
    const score = Math.min(92, 58 + Math.round((chunk.length / 40) * 20) + (text.includes("?") ? 6 : 0));
    out.push({
      id: `clip_${i}`,
      start, end, score,
      reason: "Heuristic pick (LLM offline): complete thought, 15–90s window.",
      hook: text.split(" ").slice(0, 8).join(" "),
      title: text.split(" ").slice(0, 9).join(" "),
      description: text.slice(0, 180),
      hashtags: ["#shorts", "#podcast"],
      edl: buildEDL({ clip_id: `clip_${i}`, source_id: sourceId, start, end, words }),
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Apply natural-language command result (LLM returns EDL patch ops).
export function applyPatch(edl: EDL, patch: Partial<EDL> & { trim_start?: number; trim_end?: number }): EDL {
  const next: EDL = JSON.parse(JSON.stringify(edl));
  if (typeof patch.trim_start === "number") next.segments[0].src_start += patch.trim_start;
  if (typeof patch.trim_end === "number") next.segments[0].src_end += patch.trim_end;
  if (patch.captions) next.captions = { ...next.captions, ...patch.captions };
  if (patch.overlays) next.overlays = patch.overlays;
  if (patch.aspect) next.aspect = patch.aspect;
  if (patch.audio) next.audio = { ...next.audio, ...patch.audio };
  return next;
}

export function toSRT(words: Word[]): string {
  const groups: Word[][] = [];
  for (let i = 0; i < words.length; i += 7) groups.push(words.slice(i, i + 7));
  const ts = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60); const ms = Math.round((s % 1) * 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
  };
  return groups.map((g, i) => `${i + 1}\n${ts(g[0].s)} --> ${ts(g[g.length - 1].e)}\n${g.map((w) => w.w).join(" ")}\n`).join("\n");
}
