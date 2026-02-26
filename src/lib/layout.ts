/**
 * Layout engine: flows lessons+MCQs into A4 pages with 2 columns.
 * Used by both the preview renderer and the PDF generator.
 *
 * A4 at 96dpi screen: 794 × 1123 px
 * We compute everything in "px at 96dpi" and convert to mm/pt for PDF.
 */

import { Lesson, MCQ, GlobalSettings, LayoutBlock, LayoutColumn, LayoutPage, ComputedLayout } from "./types";

export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const MM_TO_PX = 96 / 25.4; // 3.7795...
export const PX_TO_PT = 72 / 96; // 0.75

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

export function pxToMm(px: number): number {
  return px / MM_TO_PX;
}

/**
 * Estimate the pixel height of a MCQ block given current settings.
 */
export function estimateMcqHeight(mcq: MCQ, settings: GlobalSettings, colWidthPx: number): number {
  const { mcqFontSize, propFontSize, density, enableExplanations } = settings;
  const lineH = (fontSize: number) => fontSize * 1.4 * density;

  // Stem: estimate lines based on char count / col width
  const charsPerLine = Math.max(10, Math.floor(colWidthPx / (mcqFontSize * 0.55)));
  const stemLines = Math.max(1, Math.ceil(mcq.stem.length / charsPerLine));
  let h = stemLines * lineH(mcqFontSize) + 4 * density;

  // Choices
  const numChoices = mcq.enableChoiceE ? 5 : 4;
  for (let i = 0; i < numChoices; i++) {
    const choiceKey = ["A", "B", "C", "D", "E"][i] as keyof typeof mcq.choices;
    const text = mcq.choices[choiceKey] || "";
    const charsPerLineP = Math.max(10, Math.floor((colWidthPx - 20) / (propFontSize * 0.55)));
    const lines = Math.max(1, Math.ceil(text.length / charsPerLineP));
    h += lines * lineH(propFontSize) + 2 * density;
  }

  // Explanation
  const showExp = enableExplanations && (mcq.showExplanation !== false);
  if (showExp && mcq.explanation) {
    const charsPerLineE = Math.max(10, Math.floor(colWidthPx / (propFontSize * 0.55)));
    const expLines = Math.max(1, Math.ceil(mcq.explanation.length / charsPerLineE));
    h += expLines * lineH(propFontSize) + 8 * density;
  }

  h += 12 * density; // bottom padding
  return h;
}

export function estimateLessonHeaderHeight(settings: GlobalSettings): number {
  return 28 * settings.density + 8;
}

export function estimateAnswerKeyHeight(lesson: Lesson, settings: GlobalSettings): number {
  const numChoices = 5; // always show full key
  const rowH = 18 * settings.density;
  const rows = lesson.mcqs.length;
  const headerH = 24;
  const colsNeeded = Math.ceil(rows / 20); // wrap every 20 rows
  return headerH + Math.min(rows, 20) * rowH + 16;
}

/**
 * Core layout function: returns pages with blocks placed in columns.
 */
export function computeLayout(lessons: Lesson[], settings: GlobalSettings): ComputedLayout {
  const marginTopPx = mmToPx(settings.marginTop);
  const marginBottomPx = mmToPx(settings.marginBottom);
  const marginLeftPx = mmToPx(settings.marginLeft);
  const marginRightPx = mmToPx(settings.marginRight);
  const columnGapPx = mmToPx(settings.columnGap);

  const usableWidth = A4_WIDTH_PX - marginLeftPx - marginRightPx;
  const colWidth = (usableWidth - columnGapPx) / 2;
  const pageHeight = A4_HEIGHT_PX - marginTopPx - marginBottomPx;

  const pages: LayoutPage[] = [];

  function newPage(): LayoutPage {
    const page: LayoutPage = {
      columns: [
        { blocks: [], usedHeight: 0 },
        { blocks: [], usedHeight: 0 },
      ],
    };
    pages.push(page);
    return page;
  }

  let currentPage = newPage();
  let currentColIdx = 0;

  function currentCol(): LayoutColumn {
    return currentPage.columns[currentColIdx];
  }

  function nextColumn() {
    if (currentColIdx === 0) {
      currentColIdx = 1;
    } else {
      currentPage = newPage();
      currentColIdx = 0;
    }
  }

  function placeBlock(block: LayoutBlock) {
    const col = currentCol();
    if (col.usedHeight + block.height > pageHeight && col.usedHeight > 0) {
      nextColumn();
    }
    currentCol().blocks.push(block);
    currentCol().usedHeight += block.height;
  }

  function forceNewPage() {
    currentPage = newPage();
    currentColIdx = 0;
  }

  for (let li = 0; li < lessons.length; li++) {
    const lesson = lessons[li];

    // Force new page for each lesson (except first on a fresh page)
    if (li > 0 && (currentCol().usedHeight > 0 || currentColIdx > 0)) {
      forceNewPage();
    }

    // Lesson header - spans both columns, placed at top of page
    const headerH = estimateLessonHeaderHeight(settings);
    const headerBlock: LayoutBlock = {
      type: "lesson-header",
      lessonId: lesson.id,
      lessonIndex: li,
      height: headerH,
    };
    // Header goes in col 0 as a spanning block (we'll render it specially)
    currentPage.columns[0].blocks.push(headerBlock);
    currentPage.columns[0].usedHeight += headerH;
    // Sync col 1 usedHeight so both start below the header
    currentPage.columns[1].usedHeight = Math.max(
      currentPage.columns[1].usedHeight,
      headerH
    );

    // MCQs
    for (let mi = 0; mi < lesson.mcqs.length; mi++) {
      const mcq = lesson.mcqs[mi];
      const h = estimateMcqHeight(mcq, settings, colWidth);
      const block: LayoutBlock = {
        type: "mcq",
        lessonId: lesson.id,
        lessonIndex: li,
        mcqId: mcq.id,
        mcqIndex: mi + 1,
        height: h,
      };
      placeBlock(block);
    }

    // Answer key
    const keyH = estimateAnswerKeyHeight(lesson, settings);
    const keyBlock: LayoutBlock = {
      type: "answer-key",
      lessonId: lesson.id,
      lessonIndex: li,
      height: keyH,
    };
    placeBlock(keyBlock);
  }

  return { pages };
}

/**
 * Get column width in px given settings.
 */
export function getColumnWidth(settings: GlobalSettings): number {
  const marginLeftPx = mmToPx(settings.marginLeft);
  const marginRightPx = mmToPx(settings.marginRight);
  const columnGapPx = mmToPx(settings.columnGap);
  const usableWidth = A4_WIDTH_PX - marginLeftPx - marginRightPx;
  return (usableWidth - columnGapPx) / 2;
}

/**
 * Get page content bounds in px.
 */
export function getPageBounds(settings: GlobalSettings) {
  const marginTopPx = mmToPx(settings.marginTop);
  const marginBottomPx = mmToPx(settings.marginBottom);
  const marginLeftPx = mmToPx(settings.marginLeft);
  const marginRightPx = mmToPx(settings.marginRight);
  const columnGapPx = mmToPx(settings.columnGap);
  const colWidth = getColumnWidth(settings);
  return {
    marginTopPx,
    marginBottomPx,
    marginLeftPx,
    marginRightPx,
    columnGapPx,
    colWidth,
    col0X: marginLeftPx,
    col1X: marginLeftPx + colWidth + columnGapPx,
    contentHeight: A4_HEIGHT_PX - marginTopPx - marginBottomPx,
  };
}
