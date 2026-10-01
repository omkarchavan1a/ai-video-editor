// Sliding-window rate limiter for API routes.
// In-memory per serverless instance: fine for MVP abuse protection.
// For multi-instance accuracy later, swap the Map for Upstash Redis.

const buckets = new Map<string, number[]>();

function prune(hits: number[], now: number, windowMs: number) {
  const cutoff = now - windowMs;
  while (hits.length && hits[0] < cutoff) hits.shift();
  return hits;
}

export function getClientIp(req: Request): string {
  const h = (n: string) => req.headers.get(n) || "";
  return (
    h("x-forwarded-for").split(",")[0].trim() ||
    h("x-real-ip") ||
    "unknown"
  );
}

export function checkRate(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const key = `${scope}:${getClientIp(req)}`;
  const hits = prune(buckets.get(key) || [], now, windowMs);
  if (hits.length >= limit) {
    const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000);
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfter: Math.max(1, retryAfter) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, remaining: limit - hits.length, retryAfter: 0 };
}

export function limitedResponse(retryAfter: number) {
  return Response.json(
    { error: "Rate limit exceeded. Slow down and retry.", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

// Per-route budgets (reqs/min), overridable via env.
export const BUDGETS = {
  clips: Number(process.env.RATE_LIMIT_CLIPS || 20),
  command: Number(process.env.RATE_LIMIT_COMMAND || 30),
  script: Number(process.env.RATE_LIMIT_SCRIPT || 20),
  vision: Number(process.env.RATE_LIMIT_VISION || 10),
  transcribe: Number(process.env.RATE_LIMIT_TRANSCRIBE || 10),
  events: Number(process.env.RATE_LIMIT_EVENTS || 60),
};
export const WINDOW_MS = 60_000;
