/**
 * PDF generation using pdf-lib.
 * Uses the SAME layout engine as the preview.
 */

import { PDFDocument, PDFPage, rgb, StandardFonts, PDFFont, RGB } from "pdf-lib";
import { Lesson, MCQ, GlobalSettings, LayoutBlock, LayoutPage, ChoiceLabel } from "./types";
import {
  computeLayout,
  getPageBounds,
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  pxToMm,
  mmToPx,
} from "./layout";
import { getMcqDuplicateIds } from "./duplicates";
import type { DuplicatePair } from "./types";

// A4 in points: 595.28 x 841.89
const A4_W_PT = 595.28;
const A4_H_PT = 841.89;

// Scale factor: px (96dpi screen) -> pt (72dpi)
const PX_TO_PT = A4_W_PT / A4_WIDTH_PX; // ~0.7496

function pxToPt(px: number): number {
  return px * PX_TO_PT;
}

// PDF y is bottom-up, our layout is top-down
function flipY(yPx: number, pagePx = A4_HEIGHT_PX): number {
  return pxToPt(pagePx - yPx);
}

const CHOICE_LABELS: ChoiceLabel[] = ["A", "B", "C", "D", "E"];

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidthPt: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    const w = font.widthOfTextAtSize(test, fontSize);
    if (w > maxWidthPt && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function generatePdf(
  lessons: Lesson[],
  settings: GlobalSettings,
  duplicatePairs: DuplicatePair[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const layout = computeLayout(lessons, settings);
  const bounds = getPageBounds(settings);

  const duplicateIds = settings.showDuplicateHighlighting
    ? getMcqDuplicateIds(duplicatePairs)
    : new Set<string>();

  const lessonMap = new Map<string, Lesson>();
  const mcqMap = new Map<string, MCQ>();
  for (const lesson of lessons) {
    lessonMap.set(lesson.id, lesson);
    for (const mcq of lesson.mcqs) {
      mcqMap.set(mcq.id, mcq);
    }
  }

  for (const layoutPage of layout.pages) {
    const page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);
    renderPage(page, layoutPage, lessons, lessonMap, mcqMap, settings, bounds, font, fontBold, fontOblique, duplicateIds);
  }

  return pdfDoc.save();
}

function renderPage(
  page: PDFPage,
  layoutPage: LayoutPage,
  lessons: Lesson[],
  lessonMap: Map<string, Lesson>,
  mcqMap: Map<string, MCQ>,
  settings: GlobalSettings,
  bounds: ReturnType<typeof getPageBounds>,
  font: PDFFont,
  fontBold: PDFFont,
  fontOblique: PDFFont,
  duplicateIds: Set<string>
) {
  const marginTopPt = pxToPt(bounds.marginTopPx);
  const col0XPt = pxToPt(bounds.col0X);
  const col1XPt = pxToPt(bounds.col1X);
  const colWidthPt = pxToPt(bounds.colWidth);

  const colXPt = [col0XPt, col1XPt];
  let spanHeaderRendered = false;

  for (let ci = 0; ci < 2; ci++) {
    const col = layoutPage.columns[ci];
    let yCursor = marginTopPt; // top-down in pt

    for (const block of col.blocks) {
      const xPt = colXPt[ci];

      if (block.type === "lesson-header") {
        // Render spanning header only once
        if (!spanHeaderRendered) {
          spanHeaderRendered = true;
          renderLessonHeaderPdf(page, block, lessonMap, settings, col0XPt, colWidthPt, bounds, yCursor, fontBold);
        }
        yCursor += pxToPt(block.height);
        continue;
      }

      if (block.type === "mcq" && block.mcqId) {
        const mcq = mcqMap.get(block.mcqId);
        if (mcq) {
          renderMcqPdf(
            page, mcq, block.mcqIndex!, settings, xPt, colWidthPt, yCursor,
            font, fontBold, fontOblique, duplicateIds
          );
        }
        yCursor += pxToPt(block.height);
        continue;
      }

      if (block.type === "answer-key") {
        const lesson = lessonMap.get(block.lessonId);
        if (lesson) {
          renderAnswerKeyPdf(page, lesson, settings, xPt, colWidthPt, yCursor, font, fontBold);
        }
        yCursor += pxToPt(block.height);
      }
    }
  }
}

function renderLessonHeaderPdf(
  page: PDFPage,
  block: LayoutBlock,
  lessonMap: Map<string, Lesson>,
  settings: GlobalSettings,
  xPt: number,
  colWidthPt: number,
  bounds: ReturnType<typeof getPageBounds>,
  yCursor: number,
  fontBold: PDFFont
) {
  const lesson = lessonMap.get(block.lessonId);
  if (!lesson) return;

  const fullWidthPt = colWidthPt * 2 + pxToPt(bounds.columnGapPx);
  const hPt = pxToPt(block.height);
  const fontSize = 13;
  const textY = A4_H_PT - yCursor - fontSize - 4;

  // Background rect
  page.drawRectangle({
    x: xPt,
    y: A4_H_PT - yCursor - hPt + 2,
    width: fullWidthPt,
    height: hPt - 4,
    color: rgb(0.12, 0.28, 0.68),
  });

  page.drawText(`${block.lessonIndex + 1}. ${lesson.title}`, {
    x: xPt + 8,
    y: textY,
    size: fontSize,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
}

function renderMcqPdf(
  page: PDFPage,
  mcq: MCQ,
  mcqIndex: number,
  settings: GlobalSettings,
  xPt: number,
  colWidthPt: number,
  yCursor: number,
  font: PDFFont,
  fontBold: PDFFont,
  fontOblique: PDFFont,
  duplicateIds: Set<string>
) {
  const { mcqFontSize, propFontSize, density, enableExplanations } = settings;
  const lineH = (fs: number) => fs * 1.4 * density;
  const isDup = duplicateIds.has(mcq.id);
  let y = yCursor;

  // Stem
  const stemText = `${mcqIndex}. ${mcq.stem}`;
  const stemLines = wrapText(stemText, fontBold, mcqFontSize, colWidthPt - 4);
  for (const line of stemLines) {
    const textY = A4_H_PT - y - mcqFontSize;
    page.drawText(line, {
      x: xPt + 2,
      y: textY,
      size: mcqFontSize,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.15),
    });
    if (isDup) {
      // Red underline
      page.drawLine({
        start: { x: xPt + 2, y: textY - 1.5 },
        end: { x: xPt + colWidthPt - 4, y: textY - 1.5 },
        thickness: 1.5,
        color: rgb(0.85, 0.1, 0.1),
      });
    }
    y += lineH(mcqFontSize);
  }
  y += 2 * density;

  // Choices
  const labels = CHOICE_LABELS.filter((l) => mcq.enableChoiceE || l !== "E");
  for (const label of labels) {
    const choiceText = `${label}) ${mcq.choices[label] || ""}`;
    const choiceLines = wrapText(choiceText, font, propFontSize, colWidthPt - 16);
    for (const line of choiceLines) {
      page.drawText(line, {
        x: xPt + 10,
        y: A4_H_PT - y - propFontSize,
        size: propFontSize,
        font: font,
        color: rgb(0.1, 0.1, 0.2),
      });
      y += lineH(propFontSize);
    }
    y += 1.5 * density;
  }

  // Explanation
  const showExp = enableExplanations && (mcq.showExplanation !== false);
  if (showExp && mcq.explanation) {
    y += 3 * density;
    const expPrefix = "Exp: ";
    const expLines = wrapText(expPrefix + mcq.explanation, fontOblique, propFontSize - 1, colWidthPt - 8);
    page.drawRectangle({
      x: xPt + 2,
      y: A4_H_PT - y - expLines.length * lineH(propFontSize - 1) - 4,
      width: colWidthPt - 4,
      height: expLines.length * lineH(propFontSize - 1) + 4,
      color: rgb(0.96, 0.98, 0.99),
      borderColor: rgb(0.7, 0.85, 0.95),
      borderWidth: 0.5,
    });
    for (const line of expLines) {
      page.drawText(line, {
        x: xPt + 6,
        y: A4_H_PT - y - (propFontSize - 1),
        size: propFontSize - 1,
        font: fontOblique,
        color: rgb(0.3, 0.3, 0.5),
      });
      y += lineH(propFontSize - 1);
    }
    y += 3 * density;
  }
}

function renderAnswerKeyPdf(
  page: PDFPage,
  lesson: Lesson,
  settings: GlobalSettings,
  xPt: number,
  colWidthPt: number,
  yCursor: number,
  font: PDFFont,
  fontBold: PDFFont
) {
  const fs = 8;
  const rowH = 14 * settings.density;
  const labels: ChoiceLabel[] = ["A", "B", "C", "D", "E"];

  // Header
  page.drawText("Answer Key", {
    x: xPt + 2,
    y: A4_H_PT - yCursor - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.4),
  });
  yCursor += 16;

  // Column headers
  const cellW = (colWidthPt - 30) / 5;
  page.drawText("#", { x: xPt + 2, y: A4_H_PT - yCursor - fs, size: fs, font: fontBold, color: rgb(0.3, 0.3, 0.5) });
  for (let li = 0; li < 5; li++) {
    page.drawText(labels[li], {
      x: xPt + 30 + li * cellW + cellW / 2 - 2,
      y: A4_H_PT - yCursor - fs,
      size: fs,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.4),
    });
  }
  yCursor += rowH;

  for (let i = 0; i < lesson.mcqs.length; i++) {
    const mcq = lesson.mcqs[i];
    const rowY = A4_H_PT - yCursor - fs;

    if (i % 2 === 0) {
      page.drawRectangle({
        x: xPt,
        y: rowY - 2,
        width: colWidthPt,
        height: rowH,
        color: rgb(0.96, 0.97, 0.99),
      });
    }

    page.drawText(`${i + 1}`, { x: xPt + 2, y: rowY, size: fs, font: font, color: rgb(0.3, 0.3, 0.4) });

    for (let li = 0; li < 5; li++) {
      const label = labels[li];
      const isCorrect = mcq.correctAnswers.includes(label);
      if (isCorrect) {
        page.drawText("✓", {
          x: xPt + 30 + li * cellW + cellW / 2 - 2,
          y: rowY,
          size: fs,
          font: fontBold,
          color: rgb(0.1, 0.65, 0.3),
        });
      }
    }
    yCursor += rowH;
  }
}
