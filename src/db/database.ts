import Dexie, { type Table } from "dexie";
import type { Book, Annotation, Progress, Preferences } from "../models/types";
import { duplicateKey } from "../services/search";
export class ChapterletDB extends Dexie {
  books!: Table<Book, string>;
  annotations!: Table<Annotation, string>;
  progress!: Table<Progress, string>;
  preferences!: Table<Preferences, string>;
  constructor(name = "chapterlet") {
    super(name);
    this.version(1).stores({
      books: "id,addedAt",
      annotations: "id,bookId,chapterId,kind,createdAt",
      progress: "bookId,updatedAt",
      preferences: "id",
    });
    this.version(2)
      .stores({ books: "id,addedAt,duplicateKey" })
      .upgrade((tx) =>
        tx
          .table<Book>("books")
          .toCollection()
          .modify((book) => {
            book.duplicateKey = duplicateKey(book.title, book.author);
          }),
      );
  }
}
export const db = new ChapterletDB();
export const defaultPreferences = (): Preferences => ({
  id: "reader",
  theme: window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light",
  font: "serif",
  fontSize: 20,
  lineHeight: 1.85,
  layout: "grid",
});
