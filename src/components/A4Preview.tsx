"use client";
import React, { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Lesson, MCQ, GlobalSettings, LayoutPage, LayoutBlock, ChoiceLabel } from "@/lib/types";
import {
  computeLayout,
  getPageBounds,
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
} from "@/lib/layout";
import { getMcqDuplicateIds } from "@/lib/duplicates";

const CHOICE_LABELS: ChoiceLabel[] = ["A", "B", "C", "D", "E"];

interface RenderContext {
  lessons: Lesson[];
  lessonMap: Map<string, Lesson>;
  mcqMap: Map<string, MCQ>;
  settings: GlobalSettings;
  bounds: ReturnType<typeof getPageBounds>;
  dupIds: Set<string>;
  propDupMap: Map<string, ChoiceLabel[]>;
}

function LessonHeader({ block, ctx }: { block: LayoutBlock; ctx: RenderContext }) {
  const lesson = ctx.lessonMap.get(block.lessonId);
  if (!lesson) return null;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#1e3fad",
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
      }}
    >
      <span style={{
        color: "white",
        fontWeight: 700,
        fontSize: Math.round(ctx.settings.mcqFontSize * 1.2),
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {block.lessonIndex + 1}. {lesson.title}
      </span>
    </div>
  );
}

function McqBlock({ block, ctx }: { block: LayoutBlock; ctx: RenderContext }) {
  const mcq = block.mcqId ? ctx.mcqMap.get(block.mcqId) : undefined;
  if (!mcq) return null;

  const { settings, dupIds, propDupMap } = ctx;
  const { mcqFontSize, propFontSize, density, enableExplanations } = settings;
  const lineH = (fs: number) => fs * 1.4 * density;
  const isDup = dupIds.has(mcq.id) && settings.showDuplicateHighlighting;
  const dupProps = propDupMap.get(mcq.id) ?? [];
  const showExp = enableExplanations && (mcq.showExplanation !== false);
  const labels = CHOICE_LABELS.filter((l) => mcq.enableChoiceE || l !== "E");

  return (
    <div style={{ height: block.height, overflow: "hidden", paddingBottom: 10 * density }}>
      {/* Stem */}
      <div style={{
        fontSize: mcqFontSize,
        fontWeight: 700,
        lineHeight: 1.4 * density,
        color: "#0d0d24",
        marginBottom: 3 * density,
        textDecoration: isDup ? "underline" : "none",
        textDecorationColor: isDup ? "#cc1111" : "transparent",
        textDecorationThickness: isDup ? 2 : 0,
        textUnderlineOffset: 3,
        wordBreak: "break-word",
      }}>
        {block.mcqIndex}. {mcq.stem || <span style={{ color: "#bbb", fontStyle: "italic" }}>Empty question</span>}
      </div>

      {/* Choices */}
      {labels.map((label) => {
        const isDupProp = dupProps.includes(label) && settings.showDuplicateHighlighting;
        const isCorrect = mcq.correctAnswers.includes(label);
        return (
          <div key={label} style={{
            display: "flex",
            gap: 5,
            marginBottom: 2 * density,
            fontSize: propFontSize,
            lineHeight: 1.4 * density,
          }}>
            <span style={{
              fontWeight: isCorrect ? 700 : 400,
              color: isCorrect ? "#1a7a3a" : "#444",
              minWidth: 18,
              flexShrink: 0,
            }}>
              {label})
            </span>
            <span style={{
              color: "#1a1a2e",
              wordBreak: "break-word",
              textDecoration: isDupProp ? "underline" : "none",
              textDecorationColor: isDupProp ? "#cc1111" : "transparent",
              textDecorationThickness: isDupProp ? 2 : 0,
              textUnderlineOffset: 2,
              flex: 1,
            }}>
              {mcq.choices[label] || <span style={{ color: "#ccc" }}>...</span>}
            </span>
          </div>
        );
      })}

      {/* Explanation */}
      {showExp && mcq.explanation && (
        <div style={{
          marginTop: 4 * density,
          padding: "3px 6px",
          background: "#f0f6ff",
          border: "1px solid #b8d4f0",
          borderRadius: 3,
          fontSize: propFontSize - 1,
          lineHeight: 1.4 * density,
          color: "#445",
          fontStyle: "italic",
        }}>
          <strong style={{ fontStyle: "normal" }}>Exp: </strong>{mcq.explanation}
        </div>
      )}
    </div>
  );
}

function AnswerKeyBlock({ block, ctx }: { block: LayoutBlock; ctx: RenderContext }) {
  const lesson = ctx.lessonMap.get(block.lessonId);
  if (!lesson) return null;
  const labels: ChoiceLabel[] = ["A", "B", "C", "D", "E"];
  const rowH = 18 * ctx.settings.density;
  const cellW = 22;

  return (
    <div style={{ height: block.height, overflow: "hidden" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#445", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
        Answer Key
      </div>
      <table style={{ borderCollapse: "collapse", fontSize: 8 }}>
        <thead>
          <tr>
            <th style={{ width: 24, padding: "1px 2px", color: "#667", fontWeight: 600 }}>#</th>
            {labels.map((l) => (
              <th key={l} style={{ width: cellW, padding: "1px 2px", color: "#445", fontWeight: 700, textAlign: "center" }}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lesson.mcqs.map((mcq, i) => (
            <tr key={mcq.id} style={{ background: i % 2 === 0 ? "#f7f8fc" : "white", height: rowH }}>
              <td style={{ padding: "1px 2px", color: "#666", fontSize: 7.5 }}>{i + 1}</td>
              {labels.map((label) => (
                <td key={label} style={{ padding: "1px 2px", textAlign: "center" }}>
                  {mcq.correctAnswers.includes(label) && (
                    <span style={{ color: "#1a7a3a", fontWeight: 900, fontSize: 9 }}>✓</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PagePreview({ layoutPage, pageNum, ctx }: {
  layoutPage: LayoutPage;
  pageNum: number;
  ctx: RenderContext;
}) {
  const { bounds } = ctx;

  // Headers span both columns - render them absolutely at the top
  // Find all headers in col0 with their y offsets
  const col0Blocks = layoutPage.columns[0].blocks;
  const col1Blocks = layoutPage.columns[1].blocks;

  // Compute cumulative y for each column's blocks
  const renderColBlocks = (blocks: LayoutBlock[], colIdx: number) => {
    let y = 0;
    return blocks.map((block) => {
      const blockY = y;
      y += block.height;

      if (block.type === "lesson-header") {
        // Header spans both columns - only render from col0
        if (colIdx === 1) return null;
        return (
          <div key={block.lessonId + "-header"} style={{
            position: "absolute",
            top: blockY,
            left: 0,
            width: bounds.colWidth * 2 + bounds.columnGapPx,
            height: block.height,
          }}>
            <LessonHeader block={block} ctx={ctx} />
          </div>
        );
      }
      if (block.type === "mcq") {
        return (
          <div key={block.mcqId} style={{ position: "absolute", top: blockY, left: 0, width: bounds.colWidth, height: block.height }}>
            <McqBlock block={block} ctx={ctx} />
          </div>
        );
      }
      if (block.type === "answer-key") {
        return (
          <div key={block.lessonId + "-key"} style={{ position: "absolute", top: blockY, left: 0, width: bounds.colWidth, height: block.height }}>
            <AnswerKeyBlock block={block} ctx={ctx} />
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div style={{
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
      background: "white",
      position: "relative",
      flexShrink: 0,
      fontFamily: "Helvetica, Arial, sans-serif",
    }}>
      {/* Page number */}
      <div style={{
        position: "absolute",
        bottom: bounds.marginBottomPx / 2,
        right: bounds.marginRightPx,
        fontSize: 8,
        color: "#999",
      }}>
        {pageNum}
      </div>

      {/* Column 0 */}
      <div style={{
        position: "absolute",
        top: bounds.marginTopPx,
        left: bounds.col0X,
        width: bounds.colWidth,
        height: bounds.contentHeight,
        overflow: "hidden",
      }}>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {renderColBlocks(col0Blocks, 0)}
        </div>
      </div>

      {/* Column 1 */}
      <div style={{
        position: "absolute",
        top: bounds.marginTopPx,
        left: bounds.col1X,
        width: bounds.colWidth,
        height: bounds.contentHeight,
        overflow: "hidden",
      }}>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {renderColBlocks(col1Blocks, 1)}
        </div>
      </div>
    </div>
  );
}

export function A4Preview() {
  const { lessons, settings, duplicatePairs, propDuplicates } = useStore();

  const layout = useMemo(() => computeLayout(lessons, settings), [lessons, settings]);
  const bounds = useMemo(() => getPageBounds(settings), [settings]);

  const lessonMap = useMemo(() => {
    const m = new Map<string, Lesson>();
    for (const l of lessons) m.set(l.id, l);
    return m;
  }, [lessons]);

  const mcqMap = useMemo(() => {
    const m = new Map<string, MCQ>();
    for (const l of lessons) for (const mcq of l.mcqs) m.set(mcq.id, mcq);
    return m;
  }, [lessons]);

  const dupIds = useMemo(() =>
    settings.showDuplicateHighlighting ? getMcqDuplicateIds(duplicatePairs) : new Set<string>(),
    [duplicatePairs, settings.showDuplicateHighlighting]
  );

  const propDupMap = useMemo(() => {
    const m = new Map<string, ChoiceLabel[]>();
    for (const pd of propDuplicates) m.set(pd.mcqId, pd.labels);
    return m;
  }, [propDuplicates]);

  const ctx: RenderContext = { lessons, lessonMap, mcqMap, settings, bounds, dupIds, propDupMap };

  // Scale to fit within the preview panel
  // Scale pages to fit within panel width
  // Panel min-width ~500px, we want some padding so use 480px target
  const PREVIEW_WIDTH_TARGET = 480;
  const PREVIEW_SCALE = PREVIEW_WIDTH_TARGET / A4_WIDTH_PX; // ~0.60
  const scaledPageH = A4_HEIGHT_PX * PREVIEW_SCALE;
  const scaledPageW = A4_WIDTH_PX * PREVIEW_SCALE;
  const GAP = 20;

  return (
    <div className="h-full flex flex-col" style={{ background: "#dde0e8" }}>
      <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">A4 Preview</span>
        <span className="text-xs text-gray-500 font-mono">{layout.pages.length} page{layout.pages.length !== 1 ? "s" : ""}</span>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ background: "#dde0e8" }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: GAP,
            padding: "20px 16px 32px",
          }}
        >
          {layout.pages.map((page, i) => (
            <div
              key={i}
              style={{
                width: scaledPageW,
                height: scaledPageH,
                flexShrink: 0,
                position: "relative",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {/* Inner div is full A4 size, scaled down via transform */}
              <div
                style={{
                  width: A4_WIDTH_PX,
                  height: A4_HEIGHT_PX,
                  transform: `scale(${PREVIEW_SCALE})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                <PagePreview layoutPage={page} pageNum={i + 1} ctx={ctx} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
