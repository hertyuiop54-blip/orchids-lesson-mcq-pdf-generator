export const SCHEMA_VERSION = 1;

export type ChoiceLabel = "A" | "B" | "C" | "D" | "E";

export interface MCQ {
  id: string;
  stem: string;
  choices: Record<ChoiceLabel, string>;
  enableChoiceE: boolean; // default true (5 choices)
  correctAnswers: ChoiceLabel[];
  explanation: string;
  showExplanation: boolean | null; // null = follow global, true/false = override
  isDuplicateIntentional: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  mcqs: MCQ[];
}

export interface GlobalSettings {
  projectName: string;
  mcqFontSize: number; // px
  propFontSize: number; // px
  density: number; // spacing multiplier 0.5–2.0
  marginTop: number; // mm
  marginBottom: number; // mm
  marginLeft: number; // mm
  marginRight: number; // mm
  columnGap: number; // mm
  enableExplanations: boolean;
  showDuplicateHighlighting: boolean;
  fuzzyThreshold: number; // 0–1
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  projectName: "Untitled Project",
  mcqFontSize: 11,
  propFontSize: 10,
  density: 1.0,
  marginTop: 15,
  marginBottom: 15,
  marginLeft: 15,
  marginRight: 15,
  columnGap: 8,
  enableExplanations: false,
  showDuplicateHighlighting: true,
  fuzzyThreshold: 0.85,
};

export interface ProjectData {
  version: number;
  projectName: string;
  settings: GlobalSettings;
  lessons: Lesson[];
}

// Layout engine types
export type BlockType = "lesson-header" | "mcq" | "answer-key";

export interface LayoutBlock {
  type: BlockType;
  lessonId: string;
  lessonIndex: number;
  mcqId?: string;
  mcqIndex?: number; // 1-based within lesson
  height: number; // px at 96dpi
  data?: unknown;
}

export interface LayoutColumn {
  blocks: LayoutBlock[];
  usedHeight: number;
}

export interface LayoutPage {
  columns: [LayoutColumn, LayoutColumn];
}

export interface ComputedLayout {
  pages: LayoutPage[];
}

// Duplicate detection
export interface DuplicatePair {
  id: string;
  lessonIdA: string;
  mcqIdA: string;
  lessonIdB: string;
  mcqIdB: string;
  similarity: number;
  type: "exact" | "fuzzy";
  status: "unresolved" | "keep-both" | "merged" | "intentional";
}

export interface PropDuplicate {
  mcqId: string;
  labels: ChoiceLabel[];
}
