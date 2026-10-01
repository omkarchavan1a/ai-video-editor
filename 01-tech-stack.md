# ShortForge: Tech Stack

Working title: **ShortForge**, an AI shorts creator and AI editor. Swap the name whenever.

The stack leans on what you already ship with (Next.js, FastAPI, Docker, Vercel, Gemini/OpenAI) and adds the video-specific pieces that can't be avoided: FFmpeg, speech-to-text, a render queue, and object storage.

---

## 1. Architecture at a glance

```
Browser (Next.js)
   │  REST + WebSocket/SSE (job progress)
   ▼
API Gateway (FastAPI)  ──►  Postgres (users, projects, jobs, transcripts)
   │                  └──►  Redis (queue, cache, rate limits)
   ▼
Worker pool (Celery/ARQ, Docker, GPU optional)
   ├─ Ingest: yt-dlp / upload → FFmpeg normalize
   ├─ Transcribe: Whisper (faster-whisper) → word-level timestamps
   ├─ Analyze: LLM picks highlights, hooks, titles
   ├─ Edit: FFmpeg + reframing (face/subject tracking), captions, B-roll
   └─ Render: Remotion / FFmpeg → MP4 (9:16, 1080x1920)
   ▼
Object storage (Cloudflare R2 / S3)  ──►  CDN
```

---

## 2. Frontend

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + React | Already in your toolkit, deploys to Vercel cleanly |
| Styling | Tailwind CSS + shadcn/ui | Fast to build, easy to theme |
| State | Zustand (editor state), TanStack Query (server state) | Editor state gets messy fast; keep it out of React Query |
| Timeline editor | Custom canvas/DOM timeline, or `@xzdarcy/react-timeline-editor` as a starting point | Avoid building a timeline from zero in v1 |
| Video preview | HTML5 `<video>` + `@remotion/player` for caption/overlay preview | Preview matches final render |
| Uploads | `tus-js-client` or S3 multipart presigned uploads | Resumable, big files |
| Realtime | Server-Sent Events for job progress | Simpler than WebSockets for one-way updates |

## 3. Backend

| Layer | Choice | Why |
|---|---|---|
| API | FastAPI (Python 3.12) | Python owns the ML/video ecosystem; one language for API and workers |
| Auth | Clerk or Auth.js + JWT | Don't hand-roll auth; Google login matters for creators |
| Database | PostgreSQL (Neon or Supabase) | Relational fits projects → clips → jobs; JSONB for edit decision lists |
| ORM / migrations | SQLAlchemy 2 + Alembic | Standard |
| Queue | Redis + ARQ (or Celery) | ARQ is lighter; Celery if you need complex workflows |
| Storage | Cloudflare R2 (S3-compatible) | No egress fees, which matters for video |
| Payments | Stripe (+ Razorpay for India) | Credits and subscriptions |

## 4. AI and media pipeline

| Task | Primary | Alternative |
|---|---|---|
| Speech-to-text | `faster-whisper` (large-v3) self-hosted | OpenAI Whisper API, Deepgram |
| Highlight detection / hooks / titles | Gemini API (long context is handy for full transcripts) | OpenAI GPT models, Claude |
| Scene detection | PySceneDetect | FFmpeg scene filter |
| Speaker / face tracking for 9:16 reframing | MediaPipe or YOLOv8-face + smoothing | OpenCV + custom Kalman filter |
| Silence / filler-word removal | Transcript-driven cuts (word timestamps) + FFmpeg `silencedetect` | Auditok |
| Captions | Word-level timestamps → Remotion animated captions | FFmpeg ASS subtitles (faster, less pretty) |
| Text-to-speech (for faceless shorts) | ElevenLabs | OpenAI TTS, Piper (self-hosted) |
| Stock B-roll | Pexels / Pixabay APIs | Own library |
| Image / clip generation (optional, v2) | Replicate-hosted video models | fal.ai |
| Music | Licensed library, auto-ducking via FFmpeg `sidechaincompress` | Epidemic Sound API |
| Rendering | Remotion (React-based) for styled output, raw FFmpeg for simple cuts | MoviePy (slow, avoid at scale) |

**Rule of thumb:** use FFmpeg whenever you can, Remotion only when you need designed motion graphics or captions. FFmpeg is dramatically cheaper per render minute.

## 5. BYOK option

Matches the pattern you've used elsewhere: let power users paste their own Gemini/OpenAI/ElevenLabs keys, encrypt them client-side with AES-256-GCM, and send them per request so the server never stores them in plaintext. Offer this as an alternative to platform credits.

## 6. Infrastructure and DevOps

- **Containers:** Docker for API and workers; separate images for CPU and GPU workers
- **Frontend hosting:** Vercel
- **API/worker hosting:** Fly.io or Railway for MVP; move to AWS ECS/EKS or RunPod/Modal for GPU when volume justifies it
- **GPU:** Modal or RunPod serverless for Whisper and tracking (pay per second, scale to zero)
- **CI/CD:** GitHub Actions (lint, test, build, deploy)
- **Observability:** Sentry (errors), PostHog (product analytics), Grafana + Prometheus or Logfire (queue depth, render times)
- **Secrets:** Doppler or platform-native env vars

## 7. Platform integrations

- YouTube Data API (upload Shorts, read channel)
- TikTok Content Posting API
- Instagram Graph API (Reels)
- Optional: Buffer/Zapier webhooks for scheduling

## 8. Testing

- Unit: pytest, Vitest
- Pipeline: golden-file tests (fixed 30s clip in, expected cut points out)
- E2E: Playwright for upload → generate → export
- Load: k6 against the API; synthetic queue flooding for workers

## 9. Cost notes (rough, per 10-minute source video)

| Step | Approx. cost driver |
|---|---|
| Transcription | GPU seconds (≈ 1–2 min on a decent GPU with faster-whisper) |
| LLM analysis | ~10–15k tokens |
| Rendering | CPU minutes per output clip |
| Storage/egress | Near zero on R2 |

Track these per job from day one. Credit pricing falls out of real numbers.

## 10. Decisions to lock before coding

1. Self-host Whisper or use an API for v1? (API is faster to ship; self-host wins past roughly 500 hours/month.)
2. Remotion license: it's free for individuals and small teams but requires a company license above a size threshold. Check current terms before committing.
3. Do you accept URL ingest (YouTube links)? It's a big feature and a legal gray area; see the BRD risk section.
