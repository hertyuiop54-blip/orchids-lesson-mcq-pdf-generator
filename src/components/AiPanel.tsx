"use client";
import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { Lesson, MCQ, ChoiceLabel, SCHEMA_VERSION } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const CHOICE_LABELS: ChoiceLabel[] = ["A", "B", "C", "D", "E"];

interface ParsedMcq {
  stem: string;
  choices: Record<ChoiceLabel, string>;
  correctAnswers: ChoiceLabel[];
  explanation: string;
  enableChoiceE: boolean;
}

interface ParsedLesson {
  title: string;
  mcqs: ParsedMcq[];
}

function parsedToLesson(p: ParsedLesson): Lesson {
  return {
    id: uuidv4(),
    title: p.title,
    mcqs: p.mcqs.map((pm) => ({
      id: uuidv4(),
      stem: pm.stem,
      choices: pm.choices,
      enableChoiceE: pm.enableChoiceE,
      correctAnswers: pm.correctAnswers,
      explanation: pm.explanation,
      showExplanation: null,
      isDuplicateIntentional: false,
    })),
  };
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

const PARSE_SYSTEM = `You are an expert at extracting MCQ (multiple-choice questions) from raw text.
Extract all lessons and MCQs from the provided text. Return ONLY valid JSON (no markdown, no explanation).
Format:
{
  "lessons": [
    {
      "title": "Lesson title",
      "mcqs": [
        {
          "stem": "Question text",
          "choices": {"A": "...", "B": "...", "C": "...", "D": "...", "E": "..."},
          "correctAnswers": ["A"],
          "explanation": "optional explanation",
          "enableChoiceE": true
        }
      ]
    }
  ]
}
Rules:
- If no explicit lessons, group into one lesson called "Imported".
- If a question only has 4 choices, set enableChoiceE to false and E to "".
- correctAnswers is array of letter labels.
- explanation is empty string if not present.
- Keep stems and choices verbatim, just clean whitespace.`;

export function AiPanel() {
  const { aiPanelOpen, setAiPanelOpen, applyAiImport } = useStore();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "parsing" | "preview">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [parsedLessons, setParsedLessons] = useState<ParsedLesson[]>([]);
  const [error, setError] = useState("");

  if (!aiPanelOpen) return null;

  const testKey = async () => {
    setStatus("testing");
    setError("");
    try {
      const result = await callOpenAI(apiKey, model, "You are a test assistant.", "Reply with just OK");
      if (result.toLowerCase().includes("ok") || result.length > 0) {
        setStatusMsg("Key works!");
      } else {
        setStatusMsg("Unexpected response: " + result.slice(0, 60));
      }
    } catch (e) {
      setError(String(e));
      setStatusMsg("");
    }
    setStatus("idle");
  };

  const doBulkParse = async () => {
    if (!pasteText.trim()) { setError("Paste some text first."); return; }
    setStatus("parsing");
    setError("");
    setStatusMsg("");
    try {
      const raw = await callOpenAI(apiKey, model, PARSE_SYSTEM, pasteText);
      const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (!json.lessons || !Array.isArray(json.lessons)) throw new Error("Invalid response structure");
      setParsedLessons(json.lessons);
      setStatus("preview");
    } catch (e) {
      setError(String(e));
      setStatus("idle");
    }
  };

  const doCleanFormatting = async () => {
    if (!pasteText.trim()) { setError("Paste some text first."); return; }
    setStatus("parsing");
    setError("");
    try {
      const result = await callOpenAI(
        apiKey, model,
        "Clean up formatting in this MCQ text. Fix spacing, numbering, and choice labels. Return only the cleaned text.",
        pasteText
      );
      setPasteText(result);
      setStatusMsg("Formatting cleaned.");
    } catch (e) {
      setError(String(e));
    }
    setStatus("idle");
  };

  const doSuggestGrouping = async () => {
    if (!pasteText.trim()) { setError("Paste some text first."); return; }
    setStatus("parsing");
    setError("");
    try {
      const result = await callOpenAI(
        apiKey, model,
        "Suggest how to group these MCQs into lessons/topics. Return a brief text outline.",
        pasteText
      );
      setStatusMsg(result.slice(0, 500));
    } catch (e) {
      setError(String(e));
    }
    setStatus("idle");
  };

  const applyImport = () => {
    const lessons = parsedLessons.map(parsedToLesson);
    applyAiImport(lessons);
    setAiPanelOpen(false);
    setParsedLessons([]);
    setStatus("idle");
    setPasteText("");
  };

  const loading = status === "testing" || status === "parsing";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-10 pb-10 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
              <svg viewBox="0 0 16 16" fill="#7c3aed" className="w-3.5 h-3.5"><path d="M8 1a1 1 0 00-.9.56L5.43 5H2a1 1 0 00-.68 1.73l2.64 2.43-.87 3.14A1 1 0 004.5 13.4L8 11.32l3.5 2.09a1 1 0 001.41-1.1l-.87-3.14L14.68 6.73A1 1 0 0014 5h-3.43L8.9 1.56A1 1 0 008 1z"/></svg>
            </div>
            <h2 className="font-bold text-gray-800">AI Assist</h2>
          </div>
          <button onClick={() => setAiPanelOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* API Config */}
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full mt-0.5 text-sm border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-purple-400 bg-gray-50"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Model</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="w-full mt-0.5 text-sm border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-purple-400 bg-gray-50"
              />
            </div>
            <button
              onClick={testKey}
              disabled={loading || !apiKey}
              className="self-start px-3 py-1.5 text-xs rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50 transition-colors"
            >
              {status === "testing" ? "Testing..." : "Test Key"}
            </button>
          </div>

          {/* Paste area */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Paste Text</label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={8}
              placeholder="Paste your MCQ text here (any format)..."
              className="w-full mt-0.5 text-sm border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-purple-400 bg-gray-50 resize-none font-mono"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={doBulkParse}
              disabled={loading || !apiKey || !pasteText.trim()}
              className="px-3 py-1.5 text-xs rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
            >
              {status === "parsing" ? "Parsing..." : "Bulk Paste → Organize"}
            </button>
            <button
              onClick={doCleanFormatting}
              disabled={loading || !apiKey || !pasteText.trim()}
              className="px-3 py-1.5 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Clean Formatting
            </button>
            <button
              onClick={doSuggestGrouping}
              disabled={loading || !apiKey || !pasteText.trim()}
              className="px-3 py-1.5 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Suggest Grouping
            </button>
          </div>

          {/* Error / Status */}
          {error && <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{error}</div>}
          {statusMsg && <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700 whitespace-pre-wrap">{statusMsg}</div>}

          {/* Preview */}
          {status === "preview" && parsedLessons.length > 0 && (
            <div className="border border-purple-200 rounded-lg p-3 bg-purple-50">
              <div className="text-xs font-bold text-purple-700 mb-2">
                Preview: {parsedLessons.length} lesson{parsedLessons.length > 1 ? "s" : ""} /&nbsp;
                {parsedLessons.reduce((s, l) => s + l.mcqs.length, 0)} MCQs
              </div>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {parsedLessons.map((lesson, li) => (
                  <div key={li} className="bg-white rounded p-2">
                    <div className="text-xs font-semibold text-gray-700">{lesson.title} ({lesson.mcqs.length} MCQs)</div>
                    {lesson.mcqs.slice(0, 3).map((mcq, mi) => (
                      <div key={mi} className="text-[10px] text-gray-500 truncate mt-0.5">
                        {mi + 1}. {mcq.stem || "(empty)"}
                      </div>
                    ))}
                    {lesson.mcqs.length > 3 && (
                      <div className="text-[10px] text-gray-400">+{lesson.mcqs.length - 3} more...</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={applyImport}
                  className="px-3 py-1.5 text-xs rounded-md bg-purple-600 text-white hover:bg-purple-700 font-medium"
                >
                  Apply Import
                </button>
                <button
                  onClick={() => { setStatus("idle"); setParsedLessons([]); }}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
