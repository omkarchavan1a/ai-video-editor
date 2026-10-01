# ShortForge: Functional Requirements Document (FRD)

**Version:** 0.1 draft
**Traces to:** BRD requirements BR-01 to BR-12

Each requirement has an ID, a plain statement of behavior, and acceptance criteria. "Shall" means required for MVP unless tagged otherwise.

---

## 1. System overview

Users create a **Project** from a source (upload, link, script, or idea). A pipeline of **Jobs** (ingest, transcribe, analyze, render) produces **Clips**. Each Clip is stored as an **Edit Decision List (EDL)**, a JSON description of cuts, crops, captions and overlays, which the editor reads and writes. Export renders the EDL to MP4.

Core entities: User, Workspace, Project, Source, Transcript, Clip, EDL, Job, BrandKit, Export, CreditLedger.

---

## 2. Account and workspace

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-AUTH-01 | Users shall sign up with email or Google | Account created, verification email sent, session persists 30 days |
| FR-AUTH-02 | Users shall manage profile and delete account | Deletion removes all media and transcripts within 30 days |
| FR-WS-01 | Each user shall have a default workspace | Projects belong to a workspace; agency plans can add more |
| FR-BILL-01 | Users shall buy a plan or credit packs | Stripe/Razorpay checkout; credits appear within 10 seconds of payment |
| FR-BILL-02 | The system shall deduct credits per job and show a cost estimate before running | Estimate shown pre-run; insufficient credits blocks the job with an upgrade prompt |

## 3. Source ingest

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ING-01 | Users shall upload MP4, MOV, MKV, WebM, MP3, WAV | Resumable upload; files up to 5 GB (paid), 1 GB (free); format errors explained |
| FR-ING-02 | The system shall normalize uploads (transcode to a working proxy, extract audio) | Proxy at 720p H.264 plus a 16 kHz mono audio file stored |
| FR-ING-03 | Users shall paste a video URL (post-MVP, pending legal review) | Behind a feature flag; user must confirm they hold rights |
| FR-ING-04 | Users shall start from text: script or one-line idea (faceless mode) | See section 7 |
| FR-ING-05 | The system shall show ingest progress and failure reasons | Live status via SSE; failure includes a retry button |

## 4. Transcription

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-TR-01 | The system shall produce a word-level timestamped transcript | Timestamp error under 100 ms on clean audio; speaker labels where detectable |
| FR-TR-02 | Language shall be auto-detected, with manual override | Detected language shown; override re-runs transcription |
| FR-TR-03 | Users shall edit transcript text (fix names, jargon) | Edits update captions; timestamps stay aligned |
| FR-TR-04 | Users shall add a custom vocabulary list | Terms bias the recognizer on the next run |

## 5. Clip discovery (AI Creator mode)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-CL-01 | The system shall propose 5–20 candidate clips from a source | Each candidate has start/end, 15–90 seconds, no mid-sentence cut |
| FR-CL-02 | Each candidate shall have a score (0–100) with a one-line reason | Score visible; sorted descending; reasons are human-readable |
| FR-CL-03 | Users shall set preferences: target length, topic focus, tone, number of clips | Settings change the candidate set on regeneration |
| FR-CL-04 | The system shall generate a hook (first-3-second text), title, description, hashtags per clip | Editable fields; character limits match YouTube/TikTok/IG |
| FR-CL-05 | Users shall give thumbs up/down on clips | Feedback stored and used to tune future ranking per workspace |
| FR-CL-06 | Users shall request "more like this" | Returns similar candidates from unused segments |

## 6. AI editing (applied to each clip)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ED-01 | **Auto-reframe** to 9:16, 1:1, 4:5, 16:9 | Active speaker stays in frame ≥ 95% of the time; smooth camera moves, no jitter |
| FR-ED-02 | **Split-screen / layout** presets for two speakers or screen share | At least 3 layouts: single, stacked, side-by-side |
| FR-ED-03 | **Captions**: word-synced, with style presets, highlight on active word, emoji option | Position, font, size, colors, stroke, animation editable; caption never leaves the safe area |
| FR-ED-04 | **Silence and filler removal** | One-click; user chooses aggressiveness; removed ranges shown and reversible |
| FR-ED-05 | **Auto B-roll** suggestions | Suggestions appear on the timeline; accept/reject each; user can search and swap |
| FR-ED-06 | **Background music** with auto-ducking | Library browse; volume under speech reduced by ≥ 12 dB |
| FR-ED-07 | **Audio cleanup** (noise reduction, loudness normalization to −14 LUFS) | Toggle per clip |
| FR-ED-08 | **Brand kit** application | Fonts, colors, logo watermark, intro/outro applied in one click |
| FR-ED-09 | **Text-based editing**: deleting transcript words removes the matching video | Deleting a phrase produces a cut with a short audio crossfade |
| FR-ED-10 | **Prompt editing**: "make the captions bigger", "cut the first 10 seconds", "add a zoom on the punchline" | Natural-language commands translated into EDL changes; applied change is shown and undoable |
| FR-ED-11 | **Eye-contact / zoom effects** (post-MVP) | Punch-in zooms at emphasis points, auto or manual |

## 7. Faceless / script-to-video mode (Should)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-GEN-01 | Users shall enter a topic or paste a script | Topic yields a draft script (editable) |
| FR-GEN-02 | The system shall generate voiceover with a chosen voice and speed | Preview voice sample before generating |
| FR-GEN-03 | The system shall assemble visuals from stock footage / images per sentence | Each scene shows chosen asset; swappable |
| FR-GEN-04 | Captions and music shall apply automatically | Same caption engine as section 6 |
| FR-GEN-05 | Voice cloning requires consent verification | Upload of a consent statement; blocked without it |

## 8. Editor interface

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-UI-01 | Editor shall show preview, timeline, transcript pane, and properties panel | Layout works at 1280 px width and above; tablet usable but not optimized |
| FR-UI-02 | Timeline shall support trim, split, move, delete, zoom | Snapping to word boundaries; keyboard shortcuts (space, J/K/L, S for split) |
| FR-UI-03 | Undo/redo with at least 100 steps | Persisted for the session |
| FR-UI-04 | Autosave EDL every 5 seconds and on change | No lost work on tab close |
| FR-UI-05 | Preview shall reflect captions, crop and overlays in real time | Preview frame rate ≥ 24 fps on a mid-range laptop |
| FR-UI-06 | Version history per clip (last 20 versions) | Restore any prior version |

## 9. Export and publishing

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-EX-01 | Export to MP4 H.264, up to 1080×1920, 30 or 60 fps | 60-second clip renders in under 2 minutes at typical load |
| FR-EX-02 | Batch export multiple clips | One zip or individual downloads |
| FR-EX-03 | Download captions as SRT/VTT | Matches burned-in text |
| FR-EX-04 | Free tier exports carry a watermark | Removed on paid plans |
| FR-EX-05 | Connect YouTube and publish a Short (v1.5) | OAuth; title, description, privacy, schedule fields |
| FR-EX-06 | Shareable preview link (private, expiring) | 7-day default expiry, revocable |

## 10. Jobs and queue

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-JOB-01 | Every long operation runs as an async job with status: queued, running, succeeded, failed, canceled | Status queryable and streamed |
| FR-JOB-02 | Jobs shall be retriable and idempotent | A retry never double-charges credits |
| FR-JOB-03 | Paid plans get priority queueing | Measured queue wait: Pro under 1 min at p95 |
| FR-JOB-04 | Users shall cancel a running job | Credits refunded for unstarted stages |

## 11. Admin and operations

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ADM-01 | Admin dashboard: users, jobs, failures, credit adjustments | Role-restricted, audited |
| FR-ADM-02 | Cost per job logged (GPU seconds, tokens, render minutes) | Queryable per user and per day |
| FR-ADM-03 | Content moderation flags and takedown handling | DMCA workflow with logged actions |

## 12. Key data structures

### EDL (simplified)

```json
{
  "clip_id": "clp_01",
  "source_id": "src_01",
  "aspect": "9:16",
  "segments": [
    {"src_start": 132.4, "src_end": 151.9, "speed": 1.0},
    {"src_start": 160.1, "src_end": 178.0, "speed": 1.0}
  ],
  "crop_track": [
    {"t": 0.0, "x": 0.31, "y": 0.0, "w": 0.35, "h": 1.0}
  ],
  "captions": {
    "style": "bold-pop",
    "words": [{"w": "Honestly", "s": 0.00, "e": 0.41}]
  },
  "overlays": [{"type": "text", "text": "Stop doing this", "s": 0.0, "e": 3.0}],
  "audio": {"music_id": "mus_12", "ducking": true, "lufs": -14},
  "brand_kit_id": "bk_01"
}
```

## 13. API surface (summary)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/projects` | Create project |
| POST | `/projects/{id}/sources` | Start upload / register source |
| POST | `/projects/{id}/analyze` | Run transcription and clip discovery |
| GET | `/projects/{id}/clips` | List candidates |
| PATCH | `/clips/{id}/edl` | Update edit list |
| POST | `/clips/{id}/commands` | Natural-language edit command |
| POST | `/clips/{id}/export` | Start render job |
| GET | `/jobs/{id}/events` | SSE progress stream |
| GET | `/me/credits` | Balance and ledger |

## 14. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Transcription ≤ 0.15× source duration; analysis ≤ 60 seconds for a 1-hour transcript; editor load ≤ 3 seconds |
| Scalability | Workers scale horizontally; 500 concurrent jobs without API degradation |
| Reliability | 99.5% API uptime; failed jobs auto-retry twice before surfacing |
| Security | TLS everywhere; signed, expiring media URLs; encrypted at rest; per-user storage isolation |
| Privacy | Source media never used to train models; user can delete everything |
| Accessibility | Keyboard-navigable editor; captions required for all outputs by default |
| Browser support | Latest two versions of Chrome, Edge, Safari, Firefox |
| Localization | UI in English at launch; transcription and captions in 15+ languages |
| Compliance | GDPR basics (export/delete data), DMCA agent registered |

## 15. Error handling

- Corrupt or unsupported file: reject at upload with a specific message
- No speech detected: offer music-only/visual mode or ask for another source
- LLM or provider failure: retry with fallback model, then fail gracefully with credits restored
- Render failure: keep the EDL intact, offer retry at lower settings
