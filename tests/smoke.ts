import { sampleWords } from "../lib/sample";
import { heuristicClips, toSRT, buildEDL } from "../lib/edl";
import { autoPolish, cutSilences, removeFillers } from "../lib/auto-edit";
import { llmConfig } from "../lib/llm";

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
console.log("ALL-UNIT-TESTS-DONE");
