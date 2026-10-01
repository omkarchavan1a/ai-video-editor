"use client";
// Extract small JPEG frames client-side and ask the vision LLM to score them.
// Only a handful of tiny frames are sent — cheap and Vercel-friendly.

export type VisualCue = { t: number; note: string; energy: number };

export async function grabFrames(videoUrl: string, times: number[], w = 320): Promise<{ t: number; jpg: string }[]> {
  const video = document.createElement("video");
  video.src = videoUrl; video.crossOrigin = "anonymous"; video.muted = true;
  await new Promise((res, rej) => { video.onloadedmetadata = () => res(0); video.onerror = rej; });
  const canvas = document.createElement("canvas");
  const out: { t: number; jpg: string }[] = [];
  for (const t of times) {
    video.currentTime = Math.min(Math.max(0, t), (video.duration || 1) - 0.1);
    await new Promise((r) => { video.onseeked = () => r(0); setTimeout(r, 1200); });
    const h = Math.round((w * video.videoHeight) / Math.max(1, video.videoWidth));
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    out.push({ t, jpg: canvas.toDataURL("image/jpeg", 0.6) });
  }
  return out;
}

export async function analyzeFrames(frames: { t: number; jpg: string }[]): Promise<VisualCue[]> {
  if (!frames.length) return [];
  const res = await fetch("/api/llm/vision", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frames: frames.slice(0, 8) }),
  }).then((r) => r.json()).catch(() => null);
  return (res?.cues as VisualCue[]) || [];
}
