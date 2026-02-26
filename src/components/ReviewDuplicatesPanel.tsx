"use client";
import React from "react";
import { useStore } from "@/lib/store";
import { DuplicatePair } from "@/lib/types";

export function ReviewDuplicatesPanel() {
  const {
    lessons,
    duplicatePairs,
    reviewPanelOpen,
    setReviewPanelOpen,
    updateDuplicatePairStatus,
    deleteMcqById,
    setActiveMcq,
    setActiveLesson,
  } = useStore();

  if (!reviewPanelOpen) return null;

  const mcqMap = new Map<string, { stem: string; lessonTitle: string }>();
  for (const lesson of lessons) {
    for (const mcq of lesson.mcqs) {
      mcqMap.set(mcq.id, { stem: mcq.stem, lessonTitle: lesson.title });
    }
  }

  const unresolved = duplicatePairs.filter((p) => p.status === "unresolved");
  const resolved = duplicatePairs.filter((p) => p.status !== "unresolved");

  const jumpTo = (lessonId: string, mcqId: string) => {
    setActiveLesson(lessonId);
    setActiveMcq(mcqId);
    setReviewPanelOpen(false);
  };

  const PairCard = ({ pair }: { pair: DuplicatePair }) => {
    const a = mcqMap.get(pair.mcqIdA);
    const b = mcqMap.get(pair.mcqIdB);
    const pct = Math.round(pair.similarity * 100);

    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-white mb-2">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            pair.type === "exact" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
          }`}>
            {pair.type === "exact" ? "EXACT" : `FUZZY ${pct}%`}
          </span>
          <span className="text-xs text-gray-500">
            {pair.status !== "unresolved" && (
              <span className="text-green-600 font-medium">[{pair.status}]</span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-gray-50 rounded p-2">
            <div className="text-[10px] text-gray-400 font-semibold mb-1">{a?.lessonTitle}</div>
            <div className="text-xs text-gray-700 line-clamp-2">{a?.stem || "(empty)"}</div>
            <button
              onClick={() => jumpTo(pair.lessonIdA, pair.mcqIdA)}
              className="mt-1 text-[10px] text-blue-500 hover:text-blue-700"
            >
              Jump to →
            </button>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <div className="text-[10px] text-gray-400 font-semibold mb-1">{b?.lessonTitle}</div>
            <div className="text-xs text-gray-700 line-clamp-2">{b?.stem || "(empty)"}</div>
            <button
              onClick={() => jumpTo(pair.lessonIdB, pair.mcqIdB)}
              className="mt-1 text-[10px] text-blue-500 hover:text-blue-700"
            >
              Jump to →
            </button>
          </div>
        </div>

        {pair.status === "unresolved" && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => updateDuplicatePairStatus(pair.id, "keep-both")}
              className="px-2 py-1 text-[10px] rounded border border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              Keep Both
            </button>
            <button
              onClick={() => updateDuplicatePairStatus(pair.id, "intentional")}
              className="px-2 py-1 text-[10px] rounded border border-blue-200 hover:bg-blue-50 text-blue-600"
            >
              Mark Intentional
            </button>
            <button
              onClick={() => {
                deleteMcqById(pair.mcqIdB);
                updateDuplicatePairStatus(pair.id, "merged");
              }}
              className="px-2 py-1 text-[10px] rounded border border-orange-200 hover:bg-orange-50 text-orange-600"
            >
              Delete B
            </button>
            <button
              onClick={() => {
                deleteMcqById(pair.mcqIdA);
                updateDuplicatePairStatus(pair.id, "merged");
              }}
              className="px-2 py-1 text-[10px] rounded border border-orange-200 hover:bg-orange-50 text-orange-600"
            >
              Delete A
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-10 pb-10 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800">Review Duplicates</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {unresolved.length} unresolved · {resolved.length} resolved
            </p>
          </div>
          <button
            onClick={() => setReviewPanelOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {duplicatePairs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No duplicates detected.</div>
          ) : (
            <>
              {unresolved.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Unresolved</div>
                  {unresolved.map((p) => <PairCard key={p.id} pair={p} />)}
                </>
              )}
              {resolved.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">Resolved</div>
                  {resolved.map((p) => <PairCard key={p.id} pair={p} />)}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
