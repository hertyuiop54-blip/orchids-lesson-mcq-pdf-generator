"use client";
import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { MCQ, ChoiceLabel } from "@/lib/types";

const CHOICE_LABELS: ChoiceLabel[] = ["A", "B", "C", "D", "E"];

interface McqCardProps {
  lessonId: string;
  mcq: MCQ;
  index: number;
  isDuplicate: boolean;
  dupPropLabels: ChoiceLabel[];
  isActive: boolean;
  onSelect: () => void;
}

function McqCard({ lessonId, mcq, index, isDuplicate, dupPropLabels, isActive, onSelect }: McqCardProps) {
  const { updateMcq, deleteMcq, duplicateMcq, settings } = useStore();
  const [expanded, setExpanded] = useState(false);

  const labels = CHOICE_LABELS.filter((l) => mcq.enableChoiceE || l !== "E");

  const toggleCorrect = (label: ChoiceLabel) => {
    const current = mcq.correctAnswers;
    const updated = current.includes(label)
      ? current.filter((c) => c !== label)
      : [...current, label];
    updateMcq(lessonId, mcq.id, { correctAnswers: updated });
  };

  const showExp = settings.enableExplanations && (mcq.showExplanation !== false);

  return (
    <div
      className={`border rounded-lg transition-all ${
        isActive ? "border-blue-400 shadow-sm" : "border-gray-200 hover:border-gray-300"
      } bg-white`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{index}</span>

        {isDuplicate && settings.showDuplicateHighlighting && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-100 text-orange-600 font-bold border border-orange-200 shrink-0">DUPLICATE</span>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-600 truncate">{mcq.stem || <span className="italic text-gray-400">Empty question</span>}</div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); duplicateMcq(lessonId, mcq.id); }} className="p-1 text-gray-400 hover:text-blue-500 rounded" title="Duplicate">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M5 1h7a2 2 0 012 2v9h-1V3a1 1 0 00-1-1H5V1zm-2 2h7a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); deleteMcq(lessonId, mcq.id); }} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M6 2h4l1 1h3v1H2V3h3L6 2zm1 4v6H6V6h1zm3 0v6h-1V6h1zM3 5h10l-.5 9H3.5L3 5z"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <svg viewBox="0 0 16 16" fill="currentColor" className={`w-3 h-3 transition-transform ${expanded || isActive ? "rotate-180" : ""}`}><path d="M4 6l4 4 4-4H4z"/></svg>
          </button>
        </div>
      </div>

      {/* Body - expanded or active */}
      {(expanded || isActive) && (
        <div className="p-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Stem */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Question Stem</label>
            <textarea
              value={mcq.stem}
              onChange={(e) => updateMcq(lessonId, mcq.id, { stem: e.target.value })}
              className={`w-full mt-0.5 text-sm border rounded px-2 py-1.5 outline-none resize-none focus:border-blue-400 ${
                isDuplicate && settings.showDuplicateHighlighting
                  ? "border-orange-300 bg-orange-50"
                  : "border-gray-200 bg-gray-50"
              }`}
              rows={2}
              placeholder="Enter the question..."
            />
          </div>

          {/* Choice E toggle */}
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Choices</label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <div
                onClick={() => updateMcq(lessonId, mcq.id, { enableChoiceE: !mcq.enableChoiceE })}
                className={`w-7 h-4 rounded-full transition-colors relative ${mcq.enableChoiceE ? "bg-blue-500" : "bg-gray-300"}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${mcq.enableChoiceE ? "translate-x-3.5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-[10px] text-gray-500">Choice E</span>
            </label>
          </div>

          {/* Choices */}
          <div className="flex flex-col gap-1">
            {labels.map((label) => {
              const isDupProp = dupPropLabels.includes(label) && settings.showDuplicateHighlighting;
              const isCorrect = mcq.correctAnswers.includes(label);
              return (
                <div key={label} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCorrect(label)}
                    className={`w-6 h-6 shrink-0 rounded flex items-center justify-center text-xs font-bold border transition-colors ${
                      isCorrect
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-200 text-gray-400 hover:border-green-400"
                    }`}
                    title={isCorrect ? "Remove correct" : "Mark correct"}
                  >
                    {label}
                  </button>
                  <div className="flex-1 relative">
                    <input
                      value={mcq.choices[label]}
                      onChange={(e) =>
                        updateMcq(lessonId, mcq.id, {
                          choices: { ...mcq.choices, [label]: e.target.value },
                        })
                      }
                      className={`w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 ${
                        isDupProp
                          ? "border-red-300 bg-red-50 underline decoration-red-400 decoration-2 underline-offset-2"
                          : "border-gray-200 bg-gray-50"
                      }`}
                      placeholder={`Choice ${label}...`}
                    />
                    {isDupProp && (
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-red-500 font-semibold">Repeated</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Correct answers summary */}
          {mcq.correctAnswers.length > 0 && (
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-gray-400">Correct:</span>
              {mcq.correctAnswers.map((l) => (
                <span key={l} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold">{l}</span>
              ))}
            </div>
          )}

          {/* Explanation */}
          {settings.enableExplanations && (
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Explanation</label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <div
                    onClick={() => {
                      const cur = mcq.showExplanation;
                      const next = cur === null ? false : cur === false ? true : null;
                      updateMcq(lessonId, mcq.id, { showExplanation: next });
                    }}
                    className={`w-7 h-4 rounded-full transition-colors relative ${
                      mcq.showExplanation === false
                        ? "bg-gray-300"
                        : "bg-blue-500"
                    }`}
                    title={
                      mcq.showExplanation === null
                        ? "Following global (click to hide)"
                        : mcq.showExplanation === false
                        ? "Hidden (click to show)"
                        : "Shown (click to reset)"
                    }
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                      mcq.showExplanation === false ? "translate-x-0.5" : "translate-x-3.5"
                    }`} />
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {mcq.showExplanation === null ? "Global" : mcq.showExplanation ? "Show" : "Hide"}
                  </span>
                </label>
              </div>
              {showExp && (
                <textarea
                  value={mcq.explanation}
                  onChange={(e) => updateMcq(lessonId, mcq.id, { explanation: e.target.value })}
                  className="w-full text-sm border border-blue-100 rounded px-2 py-1.5 outline-none resize-none focus:border-blue-400 bg-blue-50"
                  rows={2}
                  placeholder="Optional explanation..."
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function McqEditor() {
  const {
    lessons,
    activeLessonId,
    activeMcqId,
    setActiveMcq,
    addMcq,
    duplicatePairs,
    propDuplicates,
    settings,
  } = useStore();

  const lesson = lessons.find((l) => l.id === activeLessonId);
  if (!lesson) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select or create a lesson
      </div>
    );
  }

  const dupMcqIds = new Set<string>();
  if (settings.showDuplicateHighlighting) {
    for (const p of duplicatePairs) {
      if (p.status === "unresolved" || p.status === "keep-both") {
        dupMcqIds.add(p.mcqIdA);
        dupMcqIds.add(p.mcqIdB);
      }
    }
  }

  const propDupMap = new Map<string, ChoiceLabel[]>();
  for (const pd of propDuplicates) {
    propDupMap.set(pd.mcqId, pd.labels);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 truncate">{lesson.title}</span>
        <button
          onClick={() => addMcq(lesson.id)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/></svg>
          Add MCQ
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {lesson.mcqs.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">No MCQs yet. Click "Add MCQ" to begin.</div>
        ) : (
          lesson.mcqs.map((mcq, idx) => (
            <McqCard
              key={mcq.id}
              lessonId={lesson.id}
              mcq={mcq}
              index={idx + 1}
              isDuplicate={dupMcqIds.has(mcq.id)}
              dupPropLabels={propDupMap.get(mcq.id) ?? []}
              isActive={activeMcqId === mcq.id}
              onSelect={() => setActiveMcq(mcq.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
