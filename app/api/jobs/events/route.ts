import { useForge } from "@/lib/store";

// GET /api/jobs/events?projectId= — SSE progress stream (FR-JOB-01, FR-ING-05)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "unknown";
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let alive = true;
      const push = (data: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      push({ projectId, status: "connected", ts: Date.now() });
      const iv = setInterval(() => {
        const p = useForge.getState().projects[projectId];
        if (!p) { push({ projectId, status: "waiting" }); return; }
        push({ projectId, status: p.status, progress: p.progress, note: p.progressNote });
        if (p.status === "ready" || p.status === "failed") { clearInterval(iv); controller.close(); }
      }, 1000);
      req.signal?.addEventListener("abort", () => { alive = false; clearInterval(iv); });
      void alive;
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
