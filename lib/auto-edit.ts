// "AI does everything" layer: turns a raw candidate into a publish-ready EDL.
// Hook overlay + caption style + filler cuts + silence cuts + ducking + reframe.
import type { ClipCandidate, EDL, Word } from "./edl";
import { buildEDL } from "./edl";

const FILLERS = new Set(["um", "uh", "like", "you", "know", "basically", "actually", "literally", "so,", "right?"]);

export function pickCaptionStyle(hook: string): string {
  if (hook.length > 60) return "karaoke-box";
  if (/[!?]/g.test(hook)) return "beast";
  return "bold-pop";
}

export function removeFillers(words: Word[]): { words: Word[]; cut: number } {
  const kept = words.filter((w) => !FILLERS.has(w.w.toLowerCase().replace(/[.,!?]/g, "")));
  return { words: kept, cut: words.length - kept.length };
}

// Split segments around silence ranges (absolute source time).
export function cutSilences(edl: EDL, silences: { s: number; e: number }[]): EDL {
  const next: EDL = JSON.parse(JSON.stringify(edl));
  let segs = next.segments;
  for (const sil of silences) {
    const out: typeof segs = [];
    for (const sg of segs) {
      if (sil.e <= sg.src_start || sil.s >= sg.src_end) { out.push(sg); continue; }
      if (sil.s - sg.src_start > 0.4) out.push({ ...sg, src_end: sil.s });
      if (sg.src_end - sil.e > 0.4) out.push({ ...sg, src_start: sil.e });
    }
    segs = out;
  }
  if (segs.length) next.segments = segs;
  return next;
}

// Full auto-polish for one candidate. Returns edited EDL + notes of what AI did.
export function autoPolish(
  clip: ClipCandidate, sourceId: string, allWords: Word[], silences: { s: number; e: number }[] = []
): { edl: EDL; notes: string[] } {
  const notes: string[] = [];
  const style = pickCaptionStyle(clip.hook);
  const edl = buildEDL({ clip_id: clip.id, source_id: sourceId, start: clip.start, end: clip.end, words: allWords });
  edl.captions.style = style;
  notes.push(`Caption style: ${style}`);
  // Hook text burned in for first 3s (FR-ED-03 overlays, FR-CL-04 hook)
  edl.overlays = [{ type: "text", text: clip.hook.slice(0, 42), s: 0, e: 3 }];
  notes.push(`Hook overlay: "${clip.hook.slice(0, 42)}"`);
  // Reframe default: center crop, will be refined by face pass in exporter
  edl.crop_track = [{ t: 0, x: 0.325, y: 0, w: 0.35, h: 1 }];
  notes.push("Reframed to 9:16 (speaker-center)");
  // Audio: ducking + normalize
  edl.audio = { music_id: "lofi-01", ducking: true, lufs: -14 };
  notes.push("Music bed + auto-ducking, −14 LUFS");
  // Filler removal
  const { words, cut } = removeFillers(edl.captions.words);
  edl.captions.words = words;
  if (cut) notes.push(`Removed ${cut} filler words`);
  // Silence cuts inside this clip window
  const inClip = silences.filter((s) => s.e > clip.start && s.s < clip.end).map((s) => ({ s: s.s, e: s.e }));
  const polished = inClip.length ? cutSilences(edl, inClip) : edl;
  if (inClip.length) notes.push(`Cut ${inClip.length} silent pauses`);
  polished.brand_kit_id = "default";
  return { edl: polished, notes };
}
