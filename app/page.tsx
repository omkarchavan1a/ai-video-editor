"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForge, videoBlobRegistry } from "@/lib/store";
import { sampleWords, SAMPLE_VIDEO } from "@/lib/sample";
import { validateUpload, maxUploadFor, fmtBytes } from "@/lib/limits";

export default function Dashboard() {
  const router = useRouter();
  const { projects, credits, plan } = useForge();
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const list = Object.values(projects).sort((a, b) => b.id.localeCompare(a.id));

  async function newUpload(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const check = validateUpload(f, useForge.getState().plan);
    if (!check.ok) {
      setUploadError(check.error || "Upload rejected.");
      return;
    }
    setUploadError("");
    setBusy(true);
    const id = `prj_${Date.now()}`;
    const url = URL.createObjectURL(f);
    videoBlobRegistry.set(id, f);
    useForge.getState().upsertProject({
      id, name: f.name, sourceType: "upload", videoUrl: url, duration: 0,
      words: [], language: "en", status: "uploading", progress: 5,
      progressNote: "Upload registered (browser-local)", clips: [], creditsUsed: 0,
    });
    router.push(`/project/${id}`);
  }

  function useSample() {
    const id = `prj_${Date.now()}`;
    useForge.getState().upsertProject({
      id, name: "Sample podcast", sourceType: "sample", videoUrl: SAMPLE_VIDEO, duration: 0,
      words: sampleWords(), language: "en", status: "analyzing", progress: 30,
      progressNote: "Sample transcript loaded", clips: [], creditsUsed: 0,
    });
    router.push(`/project/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Turn one long video into a week of shorts</h1>
          <p className="text-sm text-neutral-400">Upload → transcribe → AI clips → edit → export 1080×1920. Credits: <b className="text-white">{credits}</b> · Plan: {plan}</p>
        </div>
        <div className="flex gap-2">
          <label className="btn cursor-pointer">New project — Upload
            <input type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => newUpload(e.target.files)} />
          </label>
          <button className="btn2" onClick={useSample}>Try sample (no upload)</button>
        </div>
      </div>

      {busy && <p className="text-sm text-neutral-400">Preparing…</p>}
      {uploadError && <p className="card border-red-800 text-sm text-red-300">⚠️ {uploadError}</p>}
      <p className="text-xs text-neutral-500">Max upload on {plan} plan: {fmtBytes(maxUploadFor(plan))} · MP4, MOV, MKV, WebM, MP3, WAV</p>

      <div className="grid gap-3 md:grid-cols-3">
        {list.length === 0 && <div className="card text-sm text-neutral-400">No projects yet. Upload a video or try the sample — the full pipeline (captions, reframing, editor, export) works end-to-end on Vercel.</div>}
        {list.map((p) => (
          <a key={p.id} href={`/project/${p.id}`} className="card hover:border-neutral-500">
            <div className="flex items-center justify-between">
              <b className="truncate">{p.name}</b>
              <span className="chip">{p.status} {p.progress}%</span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">{p.clips.length} clips · {p.words.length} words · {p.progressNote}</p>
          </a>
        ))}
      </div>

      <div className="card text-sm text-neutral-300">
        <b>Vercel notes:</b> video never leaves your browser (no server FFmpeg/queue needed). Only transcript text goes to the LLM
        (Nvidia Build primary, auto-routes <code>mstrl_*</code> keys to Mistral). Transcription: server Whisper if keys set, else on-device whisper-tiny, else sample/paste.
      </div>
    </div>
  );
}
