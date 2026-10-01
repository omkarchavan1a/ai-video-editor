"use client";
import { useMemo, useRef, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { useForge } from "@/lib/store";
import { applyPatch, CAPTION_PRESETS, fmtTime, toSRT, type EDL } from "@/lib/edl";
import { exportClip } from "@/lib/exporter";

export default function EditorPage({ params }: { params: Promise<{ clipId: string }> }) {
  const { clipId: projectId } = use(params);
  const q = useSearchParams();
  const clipId = q.get("clip") || "";
  const proj = useForge((s) => s.projects[projectId]);
  const savedEdl = useForge((s) => s.activeEdls[clipId]);
  const clip = proj?.clips.find((c) => c.id === clipId);
  const [edl, setEdl] = useState<EDL | null>(null);
  const active: EDL | null = edl || savedEdl || clip?.edl || null;
  const [cmd, setCmd] = useState("");
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<EDL[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const words = useMemo(() => active?.captions.words || [], [active]);
  function update(next: EDL) {
    if (active) setHistory((h) => [...h.slice(-99), active]);
    setEdl(next);
    useForge.getState().setEdl(clipId, next);
  }

  async function runCommand() {
    if (!active || !cmd.trim()) return;
    setMsg("Running LLM command…");
    try {
      const res = await fetch("/api/llm/command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edl: active, command: cmd }),
      }).then((r) => r.json());
      if (res.patch) { update(applyPatch(active, res.patch)); setMsg("Applied: " + JSON.stringify(res.patch).slice(0, 200)); }
      else setMsg(res.error || "No patch");
    } catch (e) { setMsg(String(e)); }
  }

  function deleteWord(idx: number) {
    if (!active) return;
    const w = words[idx];
    const seg = active.segments[0];
    const absStart = seg.src_start + w.s, absEnd = seg.src_start + w.e;
    // Text-based editing: split segment around deleted word (FR-ED-09)
    const next: EDL = JSON.parse(JSON.stringify(active));
    next.segments = [
      { src_start: seg.src_start, src_end: absStart },
      { src_start: absEnd + 0.05, src_end: seg.src_end },
    ].filter((s) => s.src_end - s.src_start > 0.2);
    next.captions.words = words.filter((_, i) => i !== idx).map((x) => ({ ...x }));
    update(next);
  }

  async function doExport() {
    if (!active || !proj) return;
    setMsg("Rendering 1080×1920…");
    try {
      const blob = await exportClip({ videoUrl: proj.videoUrl, edl: active, onProgress: setProgress, watermark: useForge.getState().plan === "free" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${clipId || "short"}.mp4`;
      a.click();
      setMsg(`Exported ${(blob.size / 1e6).toFixed(1)} MB`);
      useForge.getState().spend(2);
    } catch (e) { setMsg("Export failed: " + String(e)); }
  }

  if (!proj || !active) return <div className="card">Clip not found. <a className="underline" href="/">Back</a></div>;
  const seg = active.segments[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Editor — {clip?.title.slice(0, 60)}</h1>
        <a className="btn2" href={`/project/${projectId}`}>← Clips</a>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <video ref={videoRef} src={proj.videoUrl} className="aspect-[9/16] max-h-[60vh] w-full rounded-xl bg-black" controls crossOrigin="anonymous" />
          <p className="text-xs text-neutral-400">Segment {fmtTime(seg.src_start)} → {fmtTime(seg.src_end)} · {active.aspect} · {words.length} words</p>
          <div className="card">
            <b>Transcript — click a word to cut it (text-based edit)</b>
            <p className="mt-2 leading-8">
              {words.map((w, i) => (
                <button key={i} title={`${w.s.toFixed(1)}s`} onClick={() => deleteWord(i)} className="mr-1 rounded bg-neutral-800 px-1 hover:bg-red-900">{w.w}</button>
              ))}
            </p>
          </div>
          <div className="card flex gap-2">
            <button className="btn2" disabled={!history.length} onClick={() => { const prev = history[history.length - 1]; setHistory(history.slice(0, -1)); setEdl(prev); }}>Undo ({history.length})</button>
            <button className="btn" onClick={doExport}>Export MP4 {progress > 0 && `${progress}%`}</button>
            <button className="btn2" onClick={() => {
              const blob = new Blob([toSRT(words)], { type: "text/plain" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "captions.srt"; a.click();
            }}>SRT</button>
          </div>
          {msg && <p className="text-sm text-neutral-300">{msg}</p>}
        </div>
        <div className="space-y-3">
          <div className="card space-y-2">
            <b>Prompt edit (FR-ED-10)</b>
            <input className="input" value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder='e.g. cut first 5s, neon captions, 1:1' />
            <button className="btn w-full" onClick={runCommand}>Apply</button>
          </div>
          <div className="card space-y-2">
            <b>Captions</b>
            <div className="flex flex-wrap gap-1">{CAPTION_PRESETS.map((p) => (
              <button key={p} className={`chip ${active.captions.style === p ? "bg-white text-black" : ""}`} onClick={() => update({ ...active, captions: { ...active.captions, style: p } })}>{p}</button>
            ))}</div>
            <label className="text-xs">Aspect
              <select className="input" value={active.aspect} onChange={(e) => update({ ...active, aspect: e.target.value as EDL["aspect"] })}>
                {["9:16", "1:1", "4:5", "16:9"].map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
            <label className="text-xs">Crop X (reframe)
              <input type="range" min={0} max={0.65} step={0.01} value={active.crop_track[0]?.x || 0.325}
                onChange={(e) => { const n = { ...active, crop_track: [{ ...active.crop_track[0], x: +e.target.value }] }; update(n); }} className="w-full" />
            </label>
          </div>
          <div className="card space-y-2">
            <b>Hook / title / hashtags</b>
            <p className="text-sm">🪝 {clip?.hook}</p>
            <p className="text-sm">{clip?.title}</p>
            <p className="text-xs text-neutral-400">{clip?.description}</p>
            <p className="text-xs">{clip?.hashtags.join(" ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
