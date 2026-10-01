"use client";
import type { EDL } from "./edl";

// Client-side vertical render: draws <video> into 1080x1920 canvas with
// center/speaker crop + captions + watermark, records to webm/mp4 via MediaRecorder.
export async function exportClip(opts: {
  videoUrl: string; edl: EDL; onProgress: (p: number) => void; watermark: boolean;
}): Promise<Blob> {
  const seg = opts.edl.segments[0];
  const dur = seg.src_end - seg.src_start;
  const W = 1080, H = 1920;
  const video = document.createElement("video");
  video.src = opts.videoUrl; video.crossOrigin = "anonymous"; video.muted = true;
  await new Promise((res, rej) => { video.onloadedmetadata = () => res(0); video.onerror = rej; });
  video.currentTime = Math.max(0, seg.src_start + 0.05);
  await new Promise((r) => { video.onseeked = () => r(0); });

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: mime })); });
  rec.start(200);

  const crop = opts.edl.crop_track[0] || { x: 0.325, w: 0.35, y: 0, h: 1, t: 0 };
  const t0 = performance.now();
  await video.play().catch(() => {});
  await new Promise<void>((resolve) => {
    const tick = () => {
      const el = (performance.now() - t0) / 1000;
      const vt = seg.src_start + el;
      if (vt >= seg.src_end || el >= dur) return resolve();
      const vw = video.videoWidth, vh = video.videoHeight;
      const sw = vw * crop.w, sh = vw * crop.w * (H / W);
      const sx = Math.min(Math.max(vw * crop.x, 0), vw - sw);
      const sy = Math.min(Math.max(((vh - sh) / 2) + vh * (crop.y || 0), 0), Math.max(0, vh - sh));
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      try { ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H); } catch {}
      // captions: active word highlight
      const words = opts.edl.captions.words;
      const active = words.filter((w) => el >= w.s && el <= w.e).slice(-7);
      if (active.length) {
        ctx.textAlign = "center";
        const text = active.map((w) => w.w).join(" ");
        ctx.font = "700 64px system-ui";
        const y = H - 420;
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = "rgba(0,0,0,.65)";
        ctx.fillRect(W / 2 - tw / 2 - 24, y - 70, tw + 48, 110);
        active.forEach((w, i) => {
          const isLast = i === active.length - 1;
          ctx.fillStyle = isLast ? "#facc15" : "#fff";
          ctx.fillText(w.w + " ", W / 2 - tw / 2 + ctx.measureText(active.slice(0, i).map((x) => x.w).join(" ") + (i ? " " : "")).width, y);
        });
      }
      for (const o of opts.edl.overlays) {
        if (el >= o.s && el <= o.e) {
          ctx.fillStyle = "#fff"; ctx.font = "800 72px system-ui"; ctx.textAlign = "center";
          ctx.fillText(o.text.slice(0, 40), W / 2, 300);
        }
      }
      if (opts.watermark) {
        ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = "600 36px system-ui"; ctx.textAlign = "right";
        ctx.fillText("ShortForge", W - 40, H - 60);
      }
      opts.onProgress(Math.min(99, Math.round((el / dur) * 100)));
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop();
  video.pause();
  opts.onProgress(100);
  return done;
}
