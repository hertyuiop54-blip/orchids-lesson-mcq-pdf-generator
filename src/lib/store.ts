import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  Lesson,
  MCQ,
  GlobalSettings,
  DEFAULT_SETTINGS,
  ProjectData,
  SCHEMA_VERSION,
  ChoiceLabel,
  DuplicatePair,
  PropDuplicate,
} from "./types";
import { detectDuplicates, detectPropDuplicates } from "./duplicates";

const STORAGE_KEY = "mcq-builder-v1";

interface AppState {
  lessons: Lesson[];
  settings: GlobalSettings;
  activeLessonId: string | null;
  activeMcqId: string | null;
  duplicatePairs: DuplicatePair[];
  propDuplicates: PropDuplicate[];
  reviewPanelOpen: boolean;
  aiPanelOpen: boolean;

  // Lesson actions
  addLesson: () => void;
  renameLesson: (id: string, title: string) => void;
  deleteLesson: (id: string) => void;
  reorderLessons: (from: number, to: number) => void;
  setActiveLesson: (id: string | null) => void;

  // MCQ actions
  addMcq: (lessonId: string) => void;
  updateMcq: (lessonId: string, mcqId: string, patch: Partial<MCQ>) => void;
  deleteMcq: (lessonId: string, mcqId: string) => void;
  duplicateMcq: (lessonId: string, mcqId: string) => void;
  reorderMcqs: (lessonId: string, from: number, to: number) => void;
  setActiveMcq: (id: string | null) => void;

  // Settings
  updateSettings: (patch: Partial<GlobalSettings>) => void;

  // Duplicate panel
  setReviewPanelOpen: (open: boolean) => void;
  updateDuplicatePairStatus: (pairId: string, status: DuplicatePair["status"]) => void;
  deleteMcqById: (mcqId: string) => void;

  // AI panel
  setAiPanelOpen: (open: boolean) => void;
  applyAiImport: (lessons: Lesson[]) => void;

  // Persistence
  saveToStorage: () => void;
  loadFromStorage: () => void;
  exportJson: () => void;
  importJson: (data: ProjectData) => void;
  resetProject: () => void;
}

function makeMcq(): MCQ {
  return {
    id: uuidv4(),
    stem: "",
    choices: { A: "", B: "", C: "", D: "", E: "" },
    enableChoiceE: true,
    correctAnswers: [],
    explanation: "",
    showExplanation: null,
    isDuplicateIntentional: false,
  };
}

function makeLesson(index: number): Lesson {
  return {
    id: uuidv4(),
    title: `Lesson ${index}`,
    mcqs: [makeMcq()],
  };
}

function recomputeDuplicates(
  lessons: Lesson[],
  settings: GlobalSettings
): { pairs: DuplicatePair[]; propDups: PropDuplicate[] } {
  const pairs = detectDuplicates(lessons, settings.fuzzyThreshold);
  const propDups = detectPropDuplicates(lessons);
  return { pairs, propDups };
}

const initialLesson = makeLesson(1);

export const useStore = create<AppState>((set, get) => ({
  lessons: [initialLesson],
  settings: DEFAULT_SETTINGS,
  activeLessonId: initialLesson.id,
  activeMcqId: initialLesson.mcqs[0].id,
  duplicatePairs: [],
  propDuplicates: [],
  reviewPanelOpen: false,
  aiPanelOpen: false,

  addLesson: () => {
    const lessons = get().lessons;
    const newLesson = makeLesson(lessons.length + 1);
    const updated = [...lessons, newLesson];
    const { pairs, propDups } = recomputeDuplicates(updated, get().settings);
    set({ lessons: updated, activeLessonId: newLesson.id, activeMcqId: newLesson.mcqs[0].id, duplicatePairs: pairs, propDuplicates: propDups });
    get().saveToStorage();
  },

  renameLesson: (id, title) => {
    const updated = get().lessons.map((l) => (l.id === id ? { ...l, title } : l));
    set({ lessons: updated });
    get().saveToStorage();
  },

  deleteLesson: (id) => {
    const lessons = get().lessons.filter((l) => l.id !== id);
    const { pairs, propDups } = recomputeDuplicates(lessons, get().settings);
    const activeLessonId = lessons.length > 0 ? lessons[0].id : null;
    const activeMcqId = lessons.length > 0 && lessons[0].mcqs.length > 0 ? lessons[0].mcqs[0].id : null;
    set({ lessons, duplicatePairs: pairs, propDuplicates: propDups, activeLessonId, activeMcqId });
    get().saveToStorage();
  },

  reorderLessons: (from, to) => {
    const lessons = [...get().lessons];
    const [moved] = lessons.splice(from, 1);
    lessons.splice(to, 0, moved);
    set({ lessons });
    get().saveToStorage();
  },

  setActiveLesson: (id) => {
    const lesson = get().lessons.find((l) => l.id === id);
    const activeMcqId = lesson && lesson.mcqs.length > 0 ? lesson.mcqs[0].id : null;
    set({ activeLessonId: id, activeMcqId });
  },

  addMcq: (lessonId) => {
    const newMcq = makeMcq();
    const updated = get().lessons.map((l) =>
      l.id === lessonId ? { ...l, mcqs: [...l.mcqs, newMcq] } : l
    );
    const { pairs, propDups } = recomputeDuplicates(updated, get().settings);
    set({ lessons: updated, activeMcqId: newMcq.id, duplicatePairs: pairs, propDuplicates: propDups });
    get().saveToStorage();
  },

  updateMcq: (lessonId, mcqId, patch) => {
    const updated = get().lessons.map((l) =>
      l.id === lessonId
        ? {
            ...l,
            mcqs: l.mcqs.map((m) => (m.id === mcqId ? { ...m, ...patch } : m)),
          }
        : l
    );
    const { pairs, propDups } = recomputeDuplicates(updated, get().settings);
    set({ lessons: updated, duplicatePairs: pairs, propDuplicates: propDups });
    get().saveToStorage();
  },

  deleteMcq: (lessonId, mcqId) => {
    const updated = get().lessons.map((l) =>
      l.id === lessonId ? { ...l, mcqs: l.mcqs.filter((m) => m.id !== mcqId) } : l
    );
    const { pairs, propDups } = recomputeDuplicates(updated, get().settings);
    const lesson = updated.find((l) => l.id === lessonId);
    const activeMcqId = lesson && lesson.mcqs.length > 0 ? lesson.mcqs[0].id : null;
    set({ lessons: updated, activeMcqId, duplicatePairs: pairs, propDuplicates: propDups });
    get().saveToStorage();
  },

  duplicateMcq: (lessonId, mcqId) => {
    const lesson = get().lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const mcq = lesson.mcqs.find((m) => m.id === mcqId);
    if (!mcq) return;
    const newMcq: MCQ = { ...mcq, id: uuidv4() };
    const idx = lesson.mcqs.findIndex((m) => m.id === mcqId);
    const newMcqs = [...lesson.mcqs];
    newMcqs.splice(idx + 1, 0, newMcq);
    const updated = get().lessons.map((l) => (l.id === lessonId ? { ...l, mcqs: newMcqs } : l));
    const { pairs, propDups } = recomputeDuplicates(updated, get().settings);
    set({ lessons: updated, activeMcqId: newMcq.id, duplicatePairs: pairs, propDuplicates: propDups });
    get().saveToStorage();
  },

  reorderMcqs: (lessonId, from, to) => {
    const updated = get().lessons.map((l) => {
      if (l.id !== lessonId) return l;
      const mcqs = [...l.mcqs];
      const [moved] = mcqs.splice(from, 1);
      mcqs.splice(to, 0, moved);
      return { ...l, mcqs };
    });
    set({ lessons: updated });
    get().saveToStorage();
  },

  setActiveMcq: (id) => set({ activeMcqId: id }),

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    const { pairs, propDups } = recomputeDuplicates(get().lessons, settings);
    set({ settings, duplicatePairs: pairs, propDuplicates: propDups });
    get().saveToStorage();
  },

  setReviewPanelOpen: (open) => set({ reviewPanelOpen: open }),

  updateDuplicatePairStatus: (pairId, status) => {
    set({
      duplicatePairs: get().duplicatePairs.map((p) =>
        p.id === pairId ? { ...p, status } : p
      ),
    });
  },

  deleteMcqById: (mcqId) => {
    const lessons = get().lessons.map((l) => ({
      ...l,
      mcqs: l.mcqs.filter((m) => m.id !== mcqId),
    }));
    const { pairs, propDups } = recomputeDuplicates(lessons, get().settings);
    set({ lessons, duplicatePairs: pairs, propDuplicates: propDups });
    get().saveToStorage();
  },

  setAiPanelOpen: (open) => set({ aiPanelOpen: open }),

  applyAiImport: (newLessons) => {
    const updated = [...get().lessons, ...newLessons];
    const { pairs, propDups } = recomputeDuplicates(updated, get().settings);
    const activeLessonId = newLessons.length > 0 ? newLessons[0].id : get().activeLessonId;
    set({ lessons: updated, duplicatePairs: pairs, propDuplicates: propDups, activeLessonId });
    get().saveToStorage();
  },

  saveToStorage: () => {
    const { lessons, settings } = get();
    const data: ProjectData = {
      version: SCHEMA_VERSION,
      projectName: settings.projectName,
      settings,
      lessons,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  },

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: ProjectData = JSON.parse(raw);
      if (data.version !== SCHEMA_VERSION) return;
      const { pairs, propDups } = recomputeDuplicates(data.lessons, data.settings);
      const activeLessonId = data.lessons.length > 0 ? data.lessons[0].id : null;
      const firstLesson = data.lessons[0];
      const activeMcqId = firstLesson && firstLesson.mcqs.length > 0 ? firstLesson.mcqs[0].id : null;
      set({
        lessons: data.lessons,
        settings: data.settings,
        activeLessonId,
        activeMcqId,
        duplicatePairs: pairs,
        propDuplicates: propDups,
      });
    } catch {}
  },

  exportJson: () => {
    const { lessons, settings } = get();
    const data: ProjectData = {
      version: SCHEMA_VERSION,
      projectName: settings.projectName,
      settings,
      lessons,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${settings.projectName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importJson: (data) => {
    if (data.version !== SCHEMA_VERSION) {
      alert("Incompatible file version.");
      return;
    }
    const { pairs, propDups } = recomputeDuplicates(data.lessons, data.settings);
    const activeLessonId = data.lessons.length > 0 ? data.lessons[0].id : null;
    const firstLesson = data.lessons[0];
    const activeMcqId = firstLesson && firstLesson.mcqs.length > 0 ? firstLesson.mcqs[0].id : null;
    set({
      lessons: data.lessons,
      settings: data.settings,
      activeLessonId,
      activeMcqId,
      duplicatePairs: pairs,
      propDuplicates: propDups,
    });
    get().saveToStorage();
  },

  resetProject: () => {
    const lesson = makeLesson(1);
    set({
      lessons: [lesson],
      settings: DEFAULT_SETTINGS,
      activeLessonId: lesson.id,
      activeMcqId: lesson.mcqs[0].id,
      duplicatePairs: [],
      propDuplicates: [],
    });
    get().saveToStorage();
  },
}));
