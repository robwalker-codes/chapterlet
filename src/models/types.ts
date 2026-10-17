import type { PortableBook } from "../schemas/book";
export interface Paragraph {
  id: string;
  text: string;
}
export interface Chapter {
  id: string;
  title: string;
  paragraphs: Paragraph[];
}
export interface Book extends Omit<PortableBook, "chapters"> {
  id: string;
  addedAt: number;
  duplicateKey: string;
  chapters: Chapter[];
}
export interface Segment {
  paragraphId: string;
  start: number;
  end: number;
  exact: string;
  prefix: string;
  suffix: string;
}
export interface Annotation {
  id: string;
  bookId: string;
  chapterId: string;
  kind: "highlight" | "bookmark" | "note";
  segments: Segment[];
  quote: string;
  note: string;
  color: "yellow";
  createdAt: number;
  updatedAt: number;
}
export interface Progress {
  bookId: string;
  chapterId: string;
  paragraphId: string;
  percent: number;
  updatedAt: number;
}
export interface Preferences {
  id: "reader";
  theme: "light" | "dark" | "sepia";
  font: "serif" | "sans";
  fontSize: number;
  lineHeight: number;
  layout: "grid" | "list";
}
