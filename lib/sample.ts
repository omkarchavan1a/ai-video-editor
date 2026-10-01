import type { Word } from "./edl";

// Sample transcript so the whole pipeline works with zero uploads/keys.
export function sampleWords(): Word[] {
  const sentences = [
    "Honestly the biggest mistake new creators make is waiting for perfect equipment",
    "before they post their first short video online for the world to see",
    "The algorithm does not reward perfection it rewards consistency and clear hooks",
    "So here is the exact framework I give every podcaster who wants more views",
    "First steal attention in three seconds with a bold claim or question",
    "Then deliver one single idea with proof story or example that lands fast",
    "Finally end on a complete thought with a loop so viewers watch it twice",
    "Do this daily for thirty days and your channel will look completely different",
    "And the best part is you already have the content sitting in old episodes",
    "You just need to cut reframe and caption it the right way every time",
  ];
  const words: Word[] = [];
  let t = 0;
  for (const s of sentences) {
    for (const w of s.split(" ")) { words.push({ w, s: t, e: t + 0.32 }); t += 0.38; }
    t += 0.9;
  }
  return words;
}

export const SAMPLE_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
