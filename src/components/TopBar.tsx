"use client";
import React, { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { ProjectData } from "@/lib/types";

export function TopBar() {
  const { settings, updateSettings, exportJson, importJson, resetProject, lessons, duplicatePairs, setReviewPanelOpen, setAiPanelOpen } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);

  const unresolvedDups = duplicatePairs.filter((p) => p.status === "unresolved").length;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const { generatePdf } = await import("@/lib/pdfGenerator");
      const state = useStore.getState();
      const bytes = await generatePdf(state.lessons, state.settings, state.duplicatePairs);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${settings.projectName.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("PDF generation failed: " + String(e));
    }
    setDownloading(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data: ProjectData = JSON.parse(ev.target?.result as string);
        importJson(data);
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0 z-10 shadow-sm">
      <div className="flex items-center gap-2 mr-2">
        <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
          <svg viewBox="0 0 16 16" fill="white" className="w-3.5 h-3.5"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg>
        </div>
        <span className="font-bold text-gray-800 text-sm">MCQ Builder</span>
      </div>

      <input
        value={settings.projectName}
        onChange={(e) => updateSettings({ projectName: e.target.value })}
        className="text-sm font-medium text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1 py-0.5 bg-transparent w-40"
        placeholder="Project name"
      />

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        {unresolvedDups > 0 && (
          <button
            onClick={() => setReviewPanelOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-orange-50 border border-orange-300 text-orange-700 hover:bg-orange-100 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 5zm0 7.5a1 1 0 110-2 1 1 0 010 2z"/></svg>
            {unresolvedDups} Duplicate{unresolvedDups > 1 ? "s" : ""}
          </button>
        )}

        <button
          onClick={() => setAiPanelOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-purple-50 border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 1a1 1 0 00-.9.56L5.43 5H2a1 1 0 00-.68 1.73l2.64 2.43-.87 3.14A1 1 0 004.5 13.4L8 11.32l3.5 2.09a1 1 0 001.41-1.1l-.87-3.14L14.68 6.73A1 1 0 0014 5h-3.43L8.9 1.56A1 1 0 008 1z"/></svg>
          AI Assist
        </button>

        <button
          onClick={exportJson}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 1v8.5l2.5-2.5 1 1L8 11.5 4.5 8l1-1L8 9.5V1h0zm-5 11h10v2H3v-2z"/></svg>
          Export JSON
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 15V6.5l-2.5 2.5-1-1L8 4.5l3.5 3.5-1 1L8 6.5V15H8zM3 3h10V1H3v2z"/></svg>
          Import JSON
        </button>

        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 font-medium shadow-sm"
        >
          {downloading ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 1v8.5l2.5-2.5 1 1L8 11.5 4.5 8l1-1L8 9.5V1h0zm-5 11h10v2H3v-2z"/></svg>
          )}
          Download PDF
        </button>
      </div>

      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </header>
  );
}
