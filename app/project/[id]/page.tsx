"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForge, videoBlobRegistry } from "@/lib/store";
import { heuristicClips, fmtTime, type ClipCandidate, type Word } from "@/lib/edl";
import { autoPolish } from "@/lib/auto-edit";
import { detectSilences } from "@/lib/silence";
import { grabFrames, analyzeFrames, type VisualCue } from "@/lib/vision-client";
import { transcribeViaServer, transcribeOnDevice, extractAudioTrack } from "@/lib/transcribe-client";
import { exportClip } from "@/lib/exporter";
import { COST, creditsError } from "@/lib/limits";

type DoneClip = ClipCandidate & { notes: string[] };

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const proj = useForge((s) => s.projects[id]);
  const [prefs, setPrefs] = useState({ count: 8, topic: "", tone: "punchy" });
  const [log, setLog] = useState<string[]>([]);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!proj || ran.current) return;
    ran.current = true;
    void runAutoPipeline();
    const es = new EventSource(`/api/jobs/events?projectId=${id}`);
    es.onmessage = (m) => { try { setLog((l) => [...l.slice(-8), JSON.stringify(JSON.parse(m.data))]); } catch {} };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj?.id]);

  // Fully automatic: upload → transcript → vision → clips → AI edit → ready shorts.
  async function runAutoPipeline() {
    const st = useForge.getState();
    const p = st.projects[id];
    if (!p) return;
    const set = (patch: Partial<typeof p>) => st.setStatus(id, patch);
    setBusy(true);
    try {
      const noCredits = creditsError(st.credits, COST.analyze);
      if (noCredits) {
        set({ status: "failed", progressNote: noCredits });
        setBusy(false);
        return;
      }
      if (videoRef.current) {
        await new Promise((r) => { const v = videoRef.current!; if (v.readyState >= 1) return r(0); v.onloadedmetadata = () => r(0); setTimeout(() => r(0), 4000); });
        set({ duration: videoRef.current?.duration || 0 });
      }
      const dur = useForge.getState().projects[id]?.duration || 0;

      // 1. Transcribe
      set({ status: "transcribing", progress: 10, progressNote: "AI transcribing speech…" });
      let words: Word[] = useForge.getState().projects[id]?.words || [];
      if (!words.length) {
        const blob = videoBlobRegistry.get(id);
        if (blob) {
          words = (await transcribeViaServer(await extractAudioTrack(blob))) || [];
        }
        if (!words.length && videoBlobRegistry.get(id)) {
          try {
            set({ progressNote: "AI transcribing on-device (whisper)…" });
            words = await transcribeOnDevice(p.videoUrl, (x) => set({ progress: 10 + Math.round(x * 0.3) }));
          } catch { words = []; }
        }
        if (!words.length) {
          set({ status: "transcribing", progress: 20, progressNote: "Couldn't hear speech — paste transcript or use sample.", words: [] });
          setBusy(false);
          return;
        }
        set({ words, progress: 45 });
      }

      // 2. Analyze the VIDEO (frames → vision LLM) + silence scan, in parallel
      set({ status: "analyzing", progress: 50, progressNote: "AI watching your video (frames + pauses)…" });
      const blob = videoBlobRegistry.get(id);
      const times = dur > 0 ? Array.from({ length: 8 }, (_, i) => (dur * (i + 0.5)) / 8) : [];
      const [cues, silences] = await Promise.all([
        (async (): Promise<VisualCue[]> => {
          try {
            if (!times.length) return [];
            return await analyzeFrames(await grabFrames(p.videoUrl, times));
          } catch { return []; }
        })(),
        (async () => {
          try { return blob ? await detectSilences(blob) : []; } catch { return []; }
        })(),
      ]);
      set({ progress: 62, progressNote: `AI saw ${cues.length} moments, found ${silences.length} pauses…` });

      // 3. Find highlights (transcript + visual cues)
      set({ progress: 68, progressNote: "AI picking the best moments…" });
      const res = await fetch("/api/llm/clips", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id, words, prefs, visualCues: cues }),
      }).then((r) => r.json()).catch(() => null);
      let raw: ClipCandidate[] = res?.clips?.length ? res.clips : heuristicClips(id, words, prefs.count);

      // 4. AI edits EVERY clip automatically: captions, hook, reframe, filler/silence cuts, music
      set({ progress: 82, progressNote: "AI editing every short (captions, hooks, cuts, reframe)…" });
      const done: DoneClip[] = raw.map((c) => {
        const { edl, notes } = autoPolish(c, id, words, silences);
        return { ...c, edl, notes };
      });
      // Boost clips overlapping high-energy visuals
      for (const d of done) {
        const e = cues.filter((v) => v.t >= d.start && v.t <= d.end).reduce((a, v) => a + v.energy, 0);
        if (e > 1.2) { d.score = Math.min(99, d.score + 5); d.reason += " High-energy visuals detected."; }
      }
      done.sort((a, b) => b.score - a.score);
      for (const d of done) st.setEdl(d.id, d.edl);
      st.setClips(id, done);
      st.spend(5);
      set({ progress: 100, progressNote: `Done — ${done.length} edited shorts ready (${res?.provider || "heuristic"}${cues.length ? " + vision" : ""})` });
    } catch (e) {
      set({ status: "failed", progressNote: String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function exportOne(c: DoneClip) {
    if (!proj) return;
    const noCredits = creditsError(useForge.getState().credits, COST.export);
    if (noCredits) {
      alert(noCredits);
      return;
    }
    setExporting(c.id);
    try {
      const blob = await exportClip({ videoUrl: proj.videoUrl, edl: c.edl, onProgress: () => {}, watermark: useForge.getState().plan === "free" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${c.title.slice(0, 30).replace(/[^\w]+/g, "-") || c.id}.mp4`;
      a.click();
      useForge.getState().spend(2);
    } finally {
      setExporting("");
    }
  }

  async function exportAll() {
    if (!proj) return;
    for (const c of proj.clips as DoneClip[]) await exportOne(c);
  }

  if (!proj) return <div className="card">Project not found. <a className="underline" href="/">Back</a></div>;
  const clips = proj.clips as DoneClip[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{proj.name} <span className="chip ml-2">{proj.status} {proj.progress}%</span></h1>
        <a className="btn2" href="/">← Dashboard</a>
      </div>
      <video ref={videoRef} src={proj.videoUrl} className="w-full max-h-72 rounded-xl bg-black" controls crossOrigin="anonymous" />
      <p className="text-xs text-neutral-400">{proj.progressNote} · {proj.words.length} words {proj.duration ? `· ${fmtTime(proj.duration)}` : ""}</p>

      <div className="card flex flex-wrap items-end gap-2">
        <label className="text-sm"># shorts <input className="input w-20" type="number" value={prefs.count} onChange={(e) => setPrefs({ ...prefs, count: +e.target.value })} /></label>
        <label className="text-sm">Topic <input className="input w-48" value={prefs.topic} onChange={(e) => setPrefs({ ...prefs, topic: e.target.value })} placeholder="e.g. hooks, pricing" /></label>
        <label className="text-sm">Tone <input className="input w-32" value={prefs.tone} onChange={(e) => setPrefs({ ...prefs, tone: e.target.value })} /></label>
        <button className="btn" disabled={busy} onClick={() => { ran.current = false; void runAutoPipeline(); }}>{busy ? "AI working…" : "✨ Auto-generate edited shorts"}</button>
        {clips.length > 0 && <button className="btn2" disabled={!!exporting} onClick={exportAll}>{exporting ? "Exporting…" : `Export all ${clips.length} shorts`}</button>}
      </div>

      {!proj.words.length && proj.status !== "ready" && (
        <div className="card space-y-2">
          <b>Couldn't auto-transcribe — paste transcript to let AI continue</b>
          <textarea className="input h-28" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Paste transcript…" />
          <button className="btn" onClick={() => {
            const ws: Word[] = []; let t = 0;
            for (const sent of manual.split("\n").join(" ").split(/(?<=[.!?])\s+/)) for (const w of sent.split(/\s+/).filter(Boolean)) { ws.push({ w, s: t, e: t + 0.3 }); t += 0.36; }
            useForge.getState().setStatus(id, { words: ws }); ran.current = false; void runAutoPipeline();
          }}>Continue with AI editing</button>
        </div>
      )}

      {proj.status === "ready" && clips.length > 0 && (
        <p className="card text-sm">✅ <b>Your edited shorts are ready.</b> Each one already has hook text, styled captions, 9:16 reframe, filler/silence cuts and ducked music. Preview, export, or fine-tune in the editor.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {clips.map((c) => (
          <div key={c.id} className="card">
            <div className="flex gap-3">
              <video src={`${proj.videoUrl}#t=${c.start},${c.end}`} className="aspect-[9/16] w-24 shrink-0 rounded-lg bg-black" preload="metadata" crossOrigin="anonymous" controls={false} onMouseOver={(e) => e.currentTarget.play().catch(() => {})} onMouseOut={(e) => e.currentTarget.pause()} muted playsInline />
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2"><b className="truncate">{c.title.slice(0, 60)}</b><span className="chip shrink-0">★ {c.score}</span></div>
                <p className="text-xs text-neutral-400">{fmtTime(c.start)} → {fmtTime(c.end)} · {c.edl.captions.style} captions</p>
                <p className="mt-1 text-sm">🪝 {c.hook}</p>
                <ul className="mt-1 text-xs text-emerald-300">{(c.notes || []).map((n) => <li key={n}>✓ {n}</li>)}</ul>
              </div>
            </div>
            <p className="mt-1 text-xs text-neutral-400">{c.reason} · {c.hashtags.join(" ")}</p>
            <div className="mt-2 flex gap-2">
              <button className="btn" disabled={exporting === c.id} onClick={() => void exportOne(c)}>{exporting === c.id ? "Rendering…" : "Export MP4"}</button>
              <button className="btn2" onClick={() => { useForge.getState().setEdl(c.id, c.edl); router.push(`/editor/${id}?clip=${c.id}`); }}>Fine-tune</button>
            </div>
          </div>
        ))}
      </div>
      <details className="card text-xs"><summary>Job events (SSE)</summary><pre>{log.join("\n")}</pre></details>
    </div>
  );
}
