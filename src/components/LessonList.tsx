"use client";
import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { Lesson } from "@/lib/types";

export function LessonList() {
  const {
    lessons,
    activeLessonId,
    setActiveLesson,
    addLesson,
    renameLesson,
    deleteLesson,
    reorderLessons,
    duplicatePairs,
    settings,
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const getDupCount = (lessonId: string) => {
    if (!settings.showDuplicateHighlighting) return 0;
    return duplicatePairs.filter(
      (p) =>
        p.status === "unresolved" &&
        (p.lessonIdA === lessonId || p.lessonIdB === lessonId)
    ).length;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Lessons</span>
        <button
          onClick={addLesson}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/></svg>
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {lessons.map((lesson, idx) => {
          const dupCount = getDupCount(lesson.id);
          const isActive = lesson.id === activeLessonId;
          const isDraggingOver = dragOverIdx === idx && dragIdx !== idx;

          return (
            <div
              key={lesson.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
              onDrop={() => {
                if (dragIdx !== null && dragIdx !== idx) reorderLessons(dragIdx, idx);
                setDragIdx(null); setDragOverIdx(null);
              }}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              onClick={() => { setActiveLesson(lesson.id); setEditingId(null); }}
              className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-l-2 ${
                isActive
                  ? "bg-blue-50 border-blue-500 text-blue-800"
                  : "border-transparent hover:bg-gray-50 text-gray-700"
              } ${isDraggingOver ? "border-dashed border-blue-300 bg-blue-50" : ""}`}
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-300 shrink-0 cursor-grab"><path d="M5 3a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 110 2 1 1 0 010-2zm6-8a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 110 2 1 1 0 010-2z"/></svg>

              <span className="text-xs text-gray-400 w-4 shrink-0">{idx + 1}</span>

              {editingId === lesson.id ? (
                <input
                  autoFocus
                  value={lesson.title}
                  onChange={(e) => renameLesson(lesson.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingId(null); }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs outline-none bg-white border border-blue-300 rounded px-1 py-0.5"
                />
              ) : (
                <span className="flex-1 text-xs truncate">{lesson.title}</span>
              )}

              <span className="text-xs text-gray-400 shrink-0">({lesson.mcqs.length})</span>

              {dupCount > 0 && settings.showDuplicateHighlighting && (
                <span className="shrink-0 px-1 py-0.5 rounded text-[9px] bg-orange-100 text-orange-600 font-bold">{dupCount}</span>
              )}

              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(lesson.id); }}
                  className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                  title="Rename"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M11.5 2.5a1.5 1.5 0 012.121 2.121L5.5 12.743 2 13.5l.757-3.5L11.5 2.5z"/></svg>
                </button>
                {lessons.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteLesson(lesson.id); }}
                    className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                    title="Delete"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M6 2h4l1 1h3v1H2V3h3L6 2zm1 4v6H6V6h1zm3 0v6h-1V6h1zM3 5h10l-.5 9H3.5L3 5z"/></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
