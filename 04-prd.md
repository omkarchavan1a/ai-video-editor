# ShortForge: Product Requirements Document (PRD)

**Version:** 0.1 draft
**Owner:** Omkar Chavan
**Status:** Ready for build planning

---

## 1. One-liner

Drop in a long video or an idea. Get publish-ready shorts in minutes, then fix anything you don't like in an editor that doesn't fight you.

## 2. Why now

Short-form is the main growth channel for creators, and the tools that exist force a choice: automatic but rigid, or flexible but manual. Speech models, long-context LLMs and cheap GPU time make a tool that does both feasible for a small team.

## 3. Goals and non-goals

**Goals**
- A first usable short within 10 minutes of signing up
- Clip quality good enough that most users publish with light tweaks
- An editor simple enough that a non-editor can fix a caption or a cut in seconds
- Unit economics that survive a free tier

**Non-goals (for v1)**
- Replacing Premiere or DaVinci
- Long-form editing
- Native mobile apps
- Live-stream workflows

## 4. Users and jobs to be done

| Persona | Situation | Job |
|---|---|---|
| **Podcaster Priya** | Weekly 60-minute episode, no editor | "Turn my episode into 8 clips I can post all week." |
| **Educator Arjun** | Records lectures, posts tips daily | "Pull the best 30-second explanations and caption them." |
| **Agency Maya** | Runs 6 client channels | "Apply each client's brand to batches quickly." |
| **Faceless Sam** | No camera, runs facts/story channels | "Type a topic, get a narrated short with visuals." |

## 5. Core user flow

1. **Sign up**, land on an empty dashboard with a big "New project" button.
2. **Add a source:** upload a video, or switch to "From idea/script".
3. **Pick preferences** (optional): clip length, number of clips, caption style, brand kit.
4. **Wait ~3–8 minutes** while progress shows transcribing, finding moments, reframing. User can leave; email/notification on completion.
5. **Review clip gallery:** ranked cards with preview, score, hook, title. Thumbs up/down, select the keepers.
6. **Open a clip in the editor:** adjust trim via transcript, restyle captions, swap B-roll, run a prompt command.
7. **Export** one or all. Download, or publish to YouTube (v1.5).

## 6. Feature set and priorities

### P0: MVP (cannot launch without)
| Feature | Notes |
|---|---|
| Upload + resumable transfer | Video and audio |
| Transcription with word timestamps | Auto language detect |
| AI clip discovery with scores and reasons | 5–20 candidates |
| Auto-reframe to 9:16 | Speaker tracking |
| Animated, word-synced captions | 8–10 style presets |
| Clip editor: trim, transcript editing, caption styling | Timeline + preview |
| Export 1080p MP4 | Watermark on free |
| Credits + billing | Stripe first, Razorpay next |
| Auth, dashboard, project list | |
| Job queue with live progress | |

### P1: Soon after launch
| Feature | Notes |
|---|---|
| Hooks, titles, descriptions, hashtags | Per platform |
| Silence/filler removal | One click |
| Prompt-based editing | "Make captions yellow", "cut intro" |
| Brand kits | Font, colors, logo, intro/outro |
| Auto B-roll | Stock APIs |
| Background music + ducking | |
| Multi-language captions | |
| Batch export | |

### P2: Later
- Faceless script-to-video mode with TTS
- YouTube publishing and scheduling; TikTok and Instagram after
- Team workspaces and approvals
- Public API
- Translation + AI dubbing
- Performance analytics fed back into clip ranking

## 7. Product principles

1. **AI proposes, user decides.** Every automatic choice is visible and reversible.
2. **Show your reasoning.** A clip score without a reason is noise.
3. **Fast first result beats perfect first result.** Return a rough cut quickly; polish happens in the editor.
4. **No lock-in tricks.** Exports and caption files are the user's.
5. **Honest costs.** Always show credit cost before running.

## 8. UX requirements

- **Dashboard:** project grid with status chips (processing, ready, exported).
- **Clip gallery:** vertical preview cards that autoplay muted on hover, with the score badge and hook text.
- **Editor layout:** left = transcript, center = preview, bottom = timeline, right = properties. Collapse panels on smaller screens.
- **Caption styling:** live preview, presets first, advanced controls tucked away.
- **Empty and error states** are designed, not defaults: they tell the user what happened and what to do.
- **Onboarding:** offer a sample video so users can see results without uploading.
- **Accessibility:** keyboard shortcuts documented in-app; sufficient contrast; captions on by default.

## 9. AI quality requirements

| Area | Target |
|---|---|
| Transcript accuracy | WER under 8% on clear English speech |
| Clip boundaries | No cut mid-word; ends on a complete thought ≥ 90% of the time |
| Clip usefulness | ≥ 60% of top-5 clips accepted by users without regeneration |
| Reframing | Subject in frame ≥ 95% of duration |
| Caption sync | Words appear within ±100 ms of speech |
| Prompt commands | ≥ 85% of supported commands produce the intended change on first try |

**Evaluation plan:** build a golden set of 30 diverse videos (podcast, lecture, interview, vlog, screen recording) with human-picked best clips. Run every pipeline change against it and track precision of top-5. Log user accept/reject signals as ongoing evaluation data.

## 10. Success metrics

| Metric | Target at 90 days post-launch |
|---|---|
| Activation (exports a short in session one) | 50% |
| Median upload → first export | < 12 minutes |
| Week-4 retention | 40% |
| Free → paid conversion | 5% |
| Clips exported per active user per week | ≥ 6 |
| Cost per source minute | Under $0.04 (tune after real data) |
| NPS | > 40 |

## 11. Pricing and packaging (draft)

| Plan | Price | Limits |
|---|---|---|
| Free | $0 | 3 exports/month, 720p, watermark |
| Creator | $19/mo | 300 source minutes, 1080p, no watermark, brand kit |
| Pro | $49/mo | 1,200 source minutes, priority queue, multi-language |
| Agency | $149/mo | 5,000 source minutes, multiple brand kits, seats |

Credits roll over one month. India pricing should be set separately (purchasing-power adjusted) with Razorpay/UPI.

## 12. Go-to-market (lean)

- Build in public: weekly before/after clips on X, LinkedIn and YouTube Shorts (eat your own cooking)
- Free tier with a visible watermark as acquisition loop
- Partner with a handful of mid-size podcasters for testimonials
- SEO pages: "turn podcast into shorts", "add captions to video", per-platform guides
- Product Hunt launch after private beta
- Affiliate program for creators

## 13. Release plan

| Milestone | Scope | Exit criteria |
|---|---|---|
| **M0: Prototype** (wk 1–2) | CLI/notebook pipeline: video → transcript → 5 clips → captioned MP4 | Looks watchable on 5 test videos |
| **M1: Alpha** (wk 3–8) | Web app with upload, clip gallery, basic editor, export | Internal team can finish a short end to end |
| **M2: Private beta** (wk 9–12) | Billing, brand kit, hooks, silence removal; 50 invited users | Activation ≥ 40%, no critical bugs for 2 weeks |
| **M3: Public launch** (wk 13–16) | Pricing live, onboarding, support docs | Cost per minute within target |
| **M4: v1.5** (wk 17–24) | Faceless mode, YouTube publishing, B-roll, music | Retention holding at target |

## 14. Dependencies

- GPU provider capacity (Modal/RunPod)
- LLM API availability and pricing (Gemini/OpenAI, with a fallback)
- Platform API approvals (YouTube audit for publishing, TikTok/Meta app review)
- Payment provider onboarding (Stripe, Razorpay)
- Legal: ToS, privacy policy, DMCA agent

## 15. Risks

| Risk | Likelihood | Impact | Response |
|---|---|---|---|
| Clip picks feel generic | Medium | High | Golden-set evaluation, feedback loop, user-tunable topic focus |
| Reframing fails on multi-person or screen-share video | High | Medium | Layout presets, manual crop keyframes as fallback |
| Rendering cost spikes | Medium | High | FFmpeg-first rendering, render caps, usage alerts |
| Platform API approval delays | High | Medium | Ship download-first; publishing is not a launch blocker |
| Copyright misuse | Medium | High | ToS, rights attestation, takedown process, URL ingest deferred |
| Solo-builder bandwidth | High | High | Hard P0 scope; buy instead of build for auth, billing, uploads |

## 16. Open questions

1. Should the free tier require a credit card? (Lower abuse vs. lower signups.)
2. Is the primary buyer the creator or the agency? This decides whether seats and brand kits move up to P0.
3. Self-host Whisper from day one, or start on an API and migrate?
4. Do we include a virality score at all? It's a marketing hook, but a fake-precision number can erode trust. If included, label it as an estimate and show the reasons.
5. Which two languages beyond English matter most for the first market (Hindi and Spanish are obvious candidates)?

## 17. Appendix: prompt design notes for clip discovery

The highlight finder works best as a two-stage process:

1. **Segment:** split the transcript into topical chunks (using sentence embeddings or LLM-marked boundaries) so candidate clips begin and end at natural edges.
2. **Rank:** ask the LLM to score each chunk on hook strength, self-containment (makes sense without context), emotional or informational payoff, and clean ending. Return JSON with scores, a one-line reason, and a suggested hook line.

Keep the scoring rubric in versioned config, not hard-coded, so you can A/B different rubrics against the golden set.
