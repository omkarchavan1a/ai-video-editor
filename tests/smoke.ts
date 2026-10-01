import { sampleWords } from "../lib/sample";
import { heuristicClips, toSRT, buildEDL } from "../lib/edl";
import { autoPolish, cutSilences, removeFillers } from "../lib/auto-edit";
import { llmConfig } from "../lib/llm";
import { validateUpload, GB } from "../lib/limits";
import { checkRate } from "../lib/rate-limit";

const words = sampleWords();
console.log("WORDS:", words.length);

const clips = heuristicClips("src_test", words, 8);
console.log("CLIPS:", clips.length);
clips.forEach((c, i) =>
  console.log(i, "score=" + c.score, "range=" + c.start.toFixed(1) + "->" + c.end.toFixed(1), "hook=" + c.hook.slice(0, 40))
);

const first = clips[0];
const { edl, notes } = autoPolish(first, "src_test", words, [{ s: first.start + 2, e: first.start + 4 }]);
console.log("AUTOPOLISH style=", edl.captions.style, "segments=", edl.segments.length, "overlays=", JSON.stringify(edl.overlays));
console.log("NOTES:", notes.join(" | "));

const srt = toSRT(edl.captions.words);
console.log("SRT cues:", srt.split("\n\n").length, "first-text:", JSON.stringify(srt.split("\n")[2]));

const cut = cutSilences(buildEDL({ clip_id: "t", source_id: "s", start: 0, end: 60, words }), [{ s: 10, e: 12 }]);
console.log("SILENCE-CUT segments:", JSON.stringify(cut.segments));

const f = removeFillers([
  { w: "um", s: 0, e: 0.3 },
  { w: "hello", s: 0.3, e: 0.6 },
  { w: "like", s: 0.6, e: 0.9 },
]);
console.log("FILLER kept:", f.words.map((w) => w.w).join(","), "cut=", f.cut);

const cfg = llmConfig();
console.log("LLM route base=", cfg.baseUrl, "model=", cfg.model, "key-prefix=", (process.env.LLM_API_KEY || "").slice(0, 6) + "...");

// Upload limits: free plan caps at 1 GB
const small = validateUpload({ name: "ep.mp4", size: 500 * 1024 * 1024, type: "video/mp4" }, "free");
const big = validateUpload({ name: "ep.mp4", size: 1.5 * GB, type: "video/mp4" }, "free");
const paid = validateUpload({ name: "ep.mp4", size: 1.5 * GB, type: "video/mp4" }, "pro");
const badType = validateUpload({ name: "doc.pdf", size: 1000, type: "application/pdf" }, "free");
console.log("UPLOAD 500MB/free:", small.ok, "| 1.5GB/free rejected:", !big.ok, "| 1.5GB/pro:", paid.ok, "| pdf rejected:", !badType.ok);

// Rate limiter: 3/min budget trips on 4th hit
const fakeReq = new Request("http://x.test/api/llm/clips", { headers: { "x-forwarded-for": "9.9.9.9" } });
const r1 = checkRate(fakeReq, "test:smoke", 3, 60_000);
const r2 = checkRate(fakeReq, "test:smoke", 3, 60_000);
const r3 = checkRate(fakeReq, "test:smoke", 3, 60_000);
const r4 = checkRate(fakeReq, "test:smoke", 3, 60_000);
console.log("RATELIMIT first3 ok:", r1.ok && r2.ok && r3.ok, "| 4th blocked:", !r4.ok, "retryAfter:", r4.retryAfter + "s");
console.log("ALL-UNIT-TESTS-DONE");
