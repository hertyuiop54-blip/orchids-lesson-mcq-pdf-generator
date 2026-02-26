"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/TopBar";
import { LessonList } from "@/components/LessonList";
import { McqEditor } from "@/components/McqEditor";
import { A4Preview } from "@/components/A4Preview";
import { GlobalControls } from "@/components/GlobalControls";
import { ReviewDuplicatesPanel } from "@/components/ReviewDuplicatesPanel";
import { AiPanel } from "@/components/AiPanel";

export default function Home() {
  const { loadFromStorage } = useStore();
  const [mounted, setMounted] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  useEffect(() => {
    loadFromStorage();
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50" style={{ fontFamily: "Inter, Helvetica, Arial, sans-serif" }}>
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: Lesson list + MCQ editor */}
        <div className="flex w-[340px] shrink-0 border-r border-gray-200 bg-white overflow-hidden">
          {/* Lesson list (top) */}
          <div className="flex flex-col w-full">
            {/* Lesson list - fixed height */}
            <div className="border-b border-gray-100" style={{ height: 200, flexShrink: 0 }}>
              <LessonList />
            </div>
            {/* MCQ editor - fills remaining space */}
            <div className="flex-1 overflow-hidden">
              <McqEditor />
            </div>
          </div>
        </div>

        {/* CENTER: A4 Preview (main) */}
        <div className="flex-1 overflow-hidden">
          <A4Preview />
        </div>

        {/* RIGHT PANEL: Global Controls */}
        <div
          className={`border-l border-gray-200 bg-white overflow-y-auto transition-all duration-200 ${
            controlsOpen ? "w-[220px]" : "w-0"
          }`}
          style={{ flexShrink: 0 }}
        >
          {controlsOpen && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Settings</span>
                <button
                  onClick={() => setControlsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                  </svg>
                </button>
              </div>
              <GlobalControls />
            </div>
          )}
        </div>

        {/* Settings toggle button when closed */}
        {!controlsOpen && (
          <button
            onClick={() => setControlsOpen(true)}
            className="shrink-0 flex flex-col items-center justify-center w-8 border-l border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors gap-1"
            title="Open settings"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
            </svg>
            <span className="text-[9px] writing-mode-vertical tracking-wider uppercase">Settings</span>
          </button>
        )}
      </div>

      {/* Modals */}
      <ReviewDuplicatesPanel />
      <AiPanel />
    </div>
  );
}
