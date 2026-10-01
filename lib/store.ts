import { create } from "zustand";
import type { ClipCandidate, EDL, Word } from "./edl";

export type Project = {
  id: string;
  name: string;
  sourceType: "upload" | "sample" | "script";
  videoUrl: string; // blob: or https:
  duration: number;
  words: Word[];
  language: string;
  status: "uploading" | "transcribing" | "analyzing" | "ready" | "failed";
  progress: number;
  progressNote: string;
  clips: ClipCandidate[];
  creditsUsed: number;
};

type State = {
  projects: Record<string, Project>;
  activeEdls: Record<string, EDL>;
  credits: number;
  plan: string;
  upsertProject: (p: Project) => void;
  setClips: (pid: string, clips: ClipCandidate[]) => void;
  setStatus: (pid: string, patch: Partial<Project>) => void;
  setEdl: (clipId: string, edl: EDL) => void;
  spend: (n: number) => void;
};

export const useForge = create<State>((set) => ({
  projects: {},
  activeEdls: {},
  credits: 150,
  plan: "free",
  upsertProject: (p) => set((s) => ({ projects: { ...s.projects, [p.id]: p } })),
  setClips: (pid, clips) => set((s) => ({
    projects: { ...s.projects, [pid]: { ...s.projects[pid], clips, status: "ready", progress: 100, progressNote: "Ready" } },
  })),
  setStatus: (pid, patch) => set((s) => ({ projects: { ...s.projects, [pid]: { ...s.projects[pid], ...patch } } })),
  setEdl: (clipId, edl) => set((s) => ({ activeEdls: { ...s.activeEdls, [clipId]: edl } })),
  spend: (n) => set((s) => ({ credits: Math.max(0, s.credits - n) })),
}));

// Persist video blobs across pages in-session (Vercel has no local media store).
export const videoBlobRegistry = new Map<string, Blob>();
