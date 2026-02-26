import Fuse from "fuse.js";
import { v4 as uuidv4 } from "uuid";
import { Lesson, MCQ, DuplicatePair, PropDuplicate, ChoiceLabel } from "./types";

const CHOICE_LABELS: ChoiceLabel[] = ["A", "B", "C", "D", "E"];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mcqFingerprint(mcq: MCQ): string {
  const choices = CHOICE_LABELS.filter((l) => mcq.enableChoiceE || l !== "E")
    .map((l) => normalize(mcq.choices[l]))
    .join("|");
  return normalize(mcq.stem) + "||" + choices;
}

function tokenSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const setA = new Set(a.split(" ").filter(Boolean));
  const setB = new Set(b.split(" ").filter(Boolean));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}

interface MCQEntry {
  lessonId: string;
  mcqId: string;
  fingerprint: string;
}

export function detectDuplicates(lessons: Lesson[], threshold = 0.85): DuplicatePair[] {
  const entries: MCQEntry[] = [];
  for (const lesson of lessons) {
    for (const mcq of lesson.mcqs) {
      if (mcq.isDuplicateIntentional) continue;
      entries.push({
        lessonId: lesson.id,
        mcqId: mcq.id,
        fingerprint: mcqFingerprint(mcq),
      });
    }
  }

  const pairs: DuplicatePair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      const key = `${a.mcqId}-${b.mcqId}`;
      if (seen.has(key)) continue;

      if (a.fingerprint === b.fingerprint && a.fingerprint.length > 0) {
        seen.add(key);
        pairs.push({
          id: uuidv4(),
          lessonIdA: a.lessonId,
          mcqIdA: a.mcqId,
          lessonIdB: b.lessonId,
          mcqIdB: b.mcqId,
          similarity: 1,
          type: "exact",
          status: "unresolved",
        });
      } else {
        const sim = tokenSimilarity(a.fingerprint, b.fingerprint);
        if (sim >= threshold && a.fingerprint.length > 5) {
          seen.add(key);
          pairs.push({
            id: uuidv4(),
            lessonIdA: a.lessonId,
            mcqIdA: a.mcqId,
            lessonIdB: b.lessonId,
            mcqIdB: b.mcqId,
            similarity: sim,
            type: "fuzzy",
            status: "unresolved",
          });
        }
      }
    }
  }

  return pairs;
}

export function detectPropDuplicates(lessons: Lesson[]): PropDuplicate[] {
  const result: PropDuplicate[] = [];
  for (const lesson of lessons) {
    for (const mcq of lesson.mcqs) {
      const labels = CHOICE_LABELS.filter((l) => mcq.enableChoiceE || l !== "E");
      const normalized = labels.map((l) => ({ label: l, text: normalize(mcq.choices[l]) }));
      const dupLabels: ChoiceLabel[] = [];
      for (let i = 0; i < normalized.length; i++) {
        if (!normalized[i].text) continue;
        for (let j = i + 1; j < normalized.length; j++) {
          const sim = tokenSimilarity(normalized[i].text, normalized[j].text);
          if (sim >= 0.9) {
            if (!dupLabels.includes(normalized[i].label)) dupLabels.push(normalized[i].label);
            if (!dupLabels.includes(normalized[j].label)) dupLabels.push(normalized[j].label);
          }
        }
      }
      if (dupLabels.length > 0) {
        result.push({ mcqId: mcq.id, labels: dupLabels });
      }
    }
  }
  return result;
}

export function getMcqDuplicateIds(pairs: DuplicatePair[]): Set<string> {
  const ids = new Set<string>();
  for (const p of pairs) {
    if (p.status === "unresolved" || p.status === "keep-both") {
      ids.add(p.mcqIdA);
      ids.add(p.mcqIdB);
    }
  }
  return ids;
}
