import type { Segment, Chapter, Book, Progress } from "../models/types";
import { plainText } from "./markdown";
export function segmentFor(
  paragraphId: string,
  text: string,
  start: number,
  end: number,
): Segment {
  return {
    paragraphId,
    start,
    end,
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - 32), start),
    suffix: text.slice(end, end + 32),
  };
}
export function reanchor(segment: Segment, text: string): Segment | null {
  if (text.slice(segment.start, segment.end) === segment.exact) return segment;
  if (!segment.exact) return null;
  const matches: number[] = [];
  let at = text.indexOf(segment.exact);
  while (at >= 0) {
    matches.push(at);
    at = text.indexOf(segment.exact, at + 1);
  }
  const contextual = matches.filter(
    (i) =>
      (!segment.prefix ||
        text.slice(Math.max(0, i - segment.prefix.length), i) ===
          segment.prefix) &&
      (!segment.suffix ||
        text.slice(
          i + segment.exact.length,
          i + segment.exact.length + segment.suffix.length,
        ) === segment.suffix),
  );
  const chosen =
    contextual.length === 1
      ? contextual[0]
      : matches.length === 1
        ? matches[0]
        : null;
  return chosen === null
    ? null
    : segmentFor(
        segment.paragraphId,
        text,
        chosen,
        chosen + segment.exact.length,
      );
}
export function captureSelection(
  root: HTMLElement,
  chapter: Chapter,
): Segment[] {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return [];
  const range = selection.getRangeAt(0);
  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  )
    return [];
  const segments: Segment[] = [];
  for (const p of chapter.paragraphs) {
    const element = root.querySelector<HTMLElement>(
      `[data-paragraph="${p.id}"]`,
    );
    if (!element || !range.intersectsNode(element)) continue;
    const local = document.createRange();
    local.selectNodeContents(element);
    if (element.contains(range.startContainer))
      local.setStart(range.startContainer, range.startOffset);
    if (element.contains(range.endContainer))
      local.setEnd(range.endContainer, range.endOffset);
    const before = document.createRange();
    before.selectNodeContents(element);
    before.setEnd(local.startContainer, local.startOffset);
    const start = before.toString().length;
    const text = plainText(p.text);
    const end = start + local.toString().length;
    if (end > start) segments.push(segmentFor(p.id, text, start, end));
  }
  return segments.some((s) => s.exact.trim()) ? segments : [];
}
export function readingPercent(
  book: Book,
  chapterId: string,
  paragraphId: string,
): number {
  const all = book.chapters.flatMap((c) =>
    c.paragraphs.map((p) => ({ chapterId: c.id, id: p.id })),
  );
  const index = all.findIndex(
    (p) => p.chapterId === chapterId && p.id === paragraphId,
  );
  return index < 0 ? 0 : Math.round(((index + 1) / all.length) * 100);
}
export function resolvePosition(book: Book, progress?: Progress) {
  const chapter =
    book.chapters.find((c) => c.id === progress?.chapterId) ?? book.chapters[0];
  return {
    chapter,
    paragraph:
      chapter.paragraphs.find((p) => p.id === progress?.paragraphId) ??
      chapter.paragraphs[0],
  };
}
