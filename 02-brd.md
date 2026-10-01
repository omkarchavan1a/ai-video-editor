# ShortForge: Business Requirements Document (BRD)

**Version:** 0.1 draft
**Product:** AI video shorts creator and AI editor
**Owner:** Omkar Chavan

---

## 1. Purpose

Short-form video (YouTube Shorts, Instagram Reels, TikTok) is where audience growth happens right now, and it's brutal to produce by hand. A creator with one 45-minute podcast episode has maybe ten good 30-second clips buried inside it, and finding, cutting, reframing, captioning and exporting them eats an entire afternoon.

ShortForge does that in minutes. It has two modes:

1. **Creator:** turn a long video, script, article or idea into finished shorts.
2. **Editor:** an AI-assisted editor where the user can tweak anything the AI produced, or edit their own footage with text-based commands.

## 2. Problem statement

- Manual clipping takes 2–4 hours per long video.
- Existing tools are either **auto-clippers with weak editing** (you can't fix a bad cut) or **full editors with no AI** (CapCut, Premiere).
- Captions, reframing to vertical, and hook writing are repetitive and well suited to automation.
- Small creators and agencies can't afford a full-time editor.

## 3. Business objectives

| # | Objective | Measure |
|---|---|---|
| O1 | Cut time-to-first-short to under 10 minutes | Median upload → export time |
| O2 | Reach product-market fit with solo creators and small agencies | 40% week-4 retention among activated users |
| O3 | Build a sustainable paid base | 5% free → paid conversion by month 6 |
| O4 | Keep gross margin healthy despite GPU/LLM costs | ≥ 60% gross margin on paid plans |
| O5 | Make the AI output good enough to publish with minimal edits | ≥ 60% of generated clips exported without manual changes |

## 4. Target users

**Primary**
- Podcasters and YouTubers repurposing long-form content
- Solo educators and coaches posting daily

**Secondary**
- Social media agencies managing several client channels
- Faceless-channel operators (script → narrated short with stock footage)
- Small business owners with no editing skills

## 5. Scope

### In scope (MVP)
- Upload a video or paste a link, get ranked clip suggestions
- Automatic vertical reframing, captions, hook text
- Browser-based editor to adjust cuts, captions, style
- Export MP4 in 9:16 (and 1:1, 16:9)
- Credit-based pricing, free tier with watermark

### Out of scope (MVP)
- Native mobile apps
- Full multi-track professional timeline
- Live-stream clipping
- Team collaboration with roles and approvals (v2)
- Direct auto-posting to all platforms (YouTube only in v1.5)

## 6. Business requirements

| ID | Requirement | Priority |
|---|---|---|
| BR-01 | The system shall turn a long-form video into multiple ranked short clips automatically | Must |
| BR-02 | The system shall add accurate, styled, word-synced captions | Must |
| BR-03 | The system shall reframe landscape video to vertical while keeping the speaker in frame | Must |
| BR-04 | Users shall be able to edit any AI output in-browser before export | Must |
| BR-05 | The system shall generate titles, hooks, descriptions and hashtags per clip | Should |
| BR-06 | The system shall support script/idea → faceless short generation | Should |
| BR-07 | Users shall be able to edit via text (transcript editing deletes video) | Should |
| BR-08 | The system shall support multiple languages for transcription and captions | Should |
| BR-09 | The system shall provide brand kits (fonts, colors, logo, intro/outro) | Should |
| BR-10 | The system shall support publishing to YouTube Shorts directly | Could |
| BR-11 | The system shall offer a bring-your-own-API-key mode | Could |
| BR-12 | The system shall provide an API for agencies | Could (v2) |

## 7. Monetization

| Plan | Price (indicative) | Included |
|---|---|---|
| Free | $0 | 3 exports/month, 720p, watermark, 30 min source limit |
| Creator | $19/mo | 300 source minutes/month (credit-based), 1080p, no watermark, brand kit |
| Pro | $49/mo | 4× credits, priority queue, multi-language, API-lite |
| Agency | $149/mo | Multiple brand kits, seats, bulk upload |
| Pay-as-you-go | credit packs | For irregular users |

Pricing is a placeholder. Set it after measuring real cost per source minute (see tech stack, section 9).

## 8. Competitive landscape

| Product | Strength | Gap ShortForge targets |
|---|---|---|
| OpusClip | Strong auto-clipping, virality scoring | Limited fine editing |
| Vizard | Good transcript editing | Reframing quality varies |
| Submagic | Excellent captions | Not a clip finder |
| CapCut | Powerful free editor | AI is shallow, manual-heavy |
| Descript | Best text-based editing | Not tuned to shorts |

**Positioning:** the only tool where the AI does 90% of the job *and* the last 10% is genuinely easy to fix.

## 9. Assumptions

- Whisper-class transcription is good enough in the top ~15 languages.
- Creators will pay for time saved if output quality is publishable.
- GPU spot pricing stays reasonable.

## 10. Constraints

- Small team (solo or 2 people), so scope must stay tight
- Compute cost scales with usage; free tier must be hard-capped
- Platform API terms (YouTube, TikTok, Meta) can change

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Copyright claims from users uploading others' videos | Legal, takedowns | ToS requiring rights, DMCA process, no public hosting by default |
| YouTube link ingest violates platform terms | Legal, blocked | Launch with upload-only; add link ingest only after legal review |
| AI picks boring or wrong clips | Churn | Feedback loop (thumbs up/down), manual override, show 15+ candidates |
| GPU/LLM cost overruns | Margin | Per-job cost tracking, credit system, queue caps |
| Commodity competition | Pricing pressure | Differentiate on editor quality and niche workflows |
| Harmful or deceptive content generation | Trust & safety | Content moderation on prompts, TTS voice-cloning consent checks |

## 12. Success metrics (KPIs)

- Activation: % of signups who export at least one short in the first session (target 50%)
- Time to first export
- Clips exported per active user per week
- Free → paid conversion
- Net revenue retention
- Cost per source minute processed
- Support tickets per 100 users

## 13. Timeline (indicative)

| Phase | Duration | Output |
|---|---|---|
| Discovery and prototype | 2 weeks | Pipeline notebook: video → clips → captions |
| MVP build | 8–10 weeks | Upload, auto-clips, captions, basic editor, export, payments |
| Private beta | 4 weeks | 50 creators, feedback, cost tuning |
| Public launch | Week 16–18 | Marketing site, pricing live |
| v1.5 | +8 weeks | YouTube publishing, brand kits, faceless mode |

## 14. Stakeholders

- Product/Engineering: Omkar Chavan
- Beta users: creators, agencies (recruited from communities)
- Legal review: external counsel before public launch (ToS, DMCA, privacy)

## 15. Approval

| Role | Name | Date | Signature |
|---|---|---|---|
| Product owner | | | |
| Tech lead | | | |
