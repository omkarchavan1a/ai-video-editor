// Plan limits + upload validation (mirrors FRD FR-ING-01, FR-BILL-02).

export const GB = 1024 ** 3;
export const MB = 1024 ** 2;

// Free: 1 GB max upload. Paid: 5 GB (FR-ING-01).
export const UPLOAD_MAX_BYTES: Record<string, number> = {
  free: 1 * GB,
  creator: 5 * GB,
  pro: 5 * GB,
  agency: 5 * GB,
};

const ACCEPTED_MIME = [
  "video/mp4", "video/quicktime", "video/x-matroska", "video/webm",
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/webm", "audio/mp4",
];
const ACCEPTED_EXT = ["mp4", "mov", "mkv", "webm", "mp3", "wav", "m4a"];

export function maxUploadFor(plan: string): number {
  return UPLOAD_MAX_BYTES[plan] ?? UPLOAD_MAX_BYTES.free;
}

export function fmtBytes(n: number): string {
  if (n >= GB) return `${(n / GB).toFixed(n >= 10 * GB ? 0 : 1)} GB`;
  return `${Math.round(n / MB)} MB`;
}

export function validateUpload(file: { name: string; size: number; type: string }, plan: string): { ok: boolean; error?: string } {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const typeOk = ACCEPTED_MIME.includes(file.type) || ACCEPTED_EXT.includes(ext) || file.type.startsWith("video/") || file.type.startsWith("audio/");
  if (!typeOk) return { ok: false, error: `Unsupported format "${ext || file.type}". Use MP4, MOV, MKV, WebM, MP3 or WAV.` };
  const max = maxUploadFor(plan);
  if (file.size > max) {
    return { ok: false, error: `File is ${fmtBytes(file.size)} — ${plan} plan allows up to ${fmtBytes(max)}. Compress it or upgrade.` };
  }
  if (file.size === 0) return { ok: false, error: "File is empty." };
  return { ok: true };
}

// Credit costs + guards (FR-BILL-02: block with upgrade prompt when broke).
export const COST = { analyze: 5, export: 2 };
export function creditsError(credits: number, need: number): string | null {
  return credits < need ? `Not enough credits (${credits} left, need ${need}). Upgrade or top up to continue.` : null;
}

// Server-side payload caps (Vercel serverless bodies are small anyway).
export const MAX_TRANSCRIPT_CHARS = 60_000;
export const MAX_VISION_FRAMES = 8;
export const MAX_FRAME_BYTES = 600_000; // ~600KB data-URL per frame
export const MAX_AUDIO_BYTES = 20 * MB; // transcribe proxy cap
